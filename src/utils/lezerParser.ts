import { SyntaxNode, Tree } from "@lezer/common";

export interface ScopeBlock {
  id: string;
  name: string;
  type: string; // Will hold: "conditional" | "looping" | "tcf" | "event" | "function" | etc.
  from: number;
  to: number;
  line: number;
}

export function getScopeType(nodeType: string): string | null {
  switch (nodeType) {
    case "ClassDeclaration":
      return "class";
    case "InterfaceDeclaration":
      return "interface";
    case "TypeAliasDeclaration":
      return "type";
    case "EnumDeclaration":
      return "enum";
    case "FunctionDeclaration":
    case "ArrowFunction":
    case "FunctionExpression":
      return "function";
    case "MethodDeclaration":
    case "MethodType":
      return "method";
    case "JSXElement":
      return "jsx";
    case "ObjectExpression":
      return "object";
    case "ArrayExpression":
      return "array";
    case "Property":
    case "PropertyDeclaration":
      return "property";
    case "VariableDeclaration":
    case "AssignmentExpression":
      return "variable";

    //  Conditionals (Type Separation for Custom SVG/Color)
    case "IfStatement":
    case "SwitchStatement":
      return "conditional";

    //  Loopings (Type Separation for Custom SVG/Color)
    case "ForStatement":
    case "ForInStatement":
    case "ForOfStatement":
    case "WhileStatement":
    case "DoStatement":
      return "looping";

    // Try-Catch-Finally (Type Separation for Custom SVG/Color)
    case "TryStatement":
    case "CatchClause":
    case "FinallyClause":
      return "tcf";

    default:
      return null;
  }
}

const directNameTokens = [
  "VariableDefinition",
  "TypeDefinition",
  "PropertyDefinition",
  "PrivatePropertyDefinition",
  "PrivatePropertyName",
  "PrivateIdentifier",
  "PropertyName",
  "JSXIdentifier",
  "JSXBuiltinIdentifier",
  "VariableName",
  "Identifier",
];

function getIdentifierName(
  node: SyntaxNode | null,
  code: string,
): string | null {
  if (!node) return null;

  if (
    node.name === "MethodDeclaration" &&
    code.slice(node.from, node.to).trim().startsWith("constructor")
  ) {
    return "constructor";
  }

  function findNameNode(n: SyntaxNode): SyntaxNode | null {
    if (directNameTokens.includes(n.name)) {
      return n;
    }
    let child = n.firstChild;
    while (child) {
      const found = findNameNode(child);
      if (found) return found;
      child = child.nextSibling;
    }
    return null;
  }

  const nameNode = findNameNode(node);
  if (nameNode) {
    return code.slice(nameNode.from, nameNode.to).trim();
  }
  return null;
}

function getCleanCallerName(
  node: SyntaxNode | null,
  code: string,
): string | null {
  if (!node) return null;
  const nodeName = node.name;

  if (
    nodeName === "VariableName" ||
    nodeName === "Identifier" ||
    nodeName === "this"
  ) {
    return code.slice(node.from, node.to).trim();
  }
  if (nodeName === "MemberExpression") {
    const left = node.firstChild;
    const right = node.getChild("PropertyName") || node.getChild("Identifier");
    if (left && right) {
      const leftName = getCleanCallerName(left, code);
      const rightName = code.slice(right.from, right.to).trim();
      return leftName ? `${leftName}.${rightName}` : rightName;
    }
  }
  if (nodeName === "CallExpression") {
    const callee = node.firstChild;
    if (callee) {
      const calleeName = getCleanCallerName(callee, code);
      return calleeName ? `${calleeName}()` : null;
    }
  }
  return null;
}

function getJSXTagName(
  node: SyntaxNode,
  code: string,
  cursorPos: number,
): string | null {
  const tagNode =
    node.getChild("JSXOpenTag") || node.getChild("JSXSelfClosingTag");
  if (!tagNode) return null;

  let tagName = "JSX";
  const nameNodeTypes = [
    "JSXIdentifier",
    "JSXBuiltinIdentifier",
    "JSXMemberExpression",
    "JSXNamespacedName",
    "Identifier",
  ];

  for (const type of nameNodeTypes) {
    const child = tagNode.getChild(type);
    if (child) {
      tagName = code.slice(child.from, child.to).trim();
      break;
    }
  }

  if (tagName === "JSX") {
    let child = tagNode.firstChild;
    while (child && (child.name === "<" || child.name === "JSXStartTag")) {
      child = child.nextSibling;
    }
    if (child) {
      const text = code.slice(child.from, child.to).trim();
      if (text && !text.startsWith("=") && !text.startsWith(">")) {
        tagName = text;
      }
    }
  }

  let attrChild = tagNode.firstChild;
  while (attrChild) {
    if (
      attrChild.name === "JSXAttribute" &&
      cursorPos >= attrChild.from &&
      cursorPos <= attrChild.to
    ) {
      const attrNameNode = attrChild.getChild("JSXIdentifier");
      if (attrNameNode) {
        return `${tagName}.${code.slice(attrNameNode.from, attrNameNode.to).trim()}`;
      }
    }
    attrChild = attrChild.nextSibling;
  }

  return tagName;
}

function getLookbackName(
  nodeFrom: number,
  code: string,
): { name: string; type: string } | null {
  let idx = nodeFrom - 1;
  let hasValidTrigger = false;
  while (idx >= 0 && idx >= nodeFrom - 120) {
    const char = code[idx];
    if (char === "=" || char === ":") {
      hasValidTrigger = true;
      break;
    }
    idx--;
  }
  if (!hasValidTrigger) return null;

  const lookbackStart = Math.max(0, nodeFrom - 120);
  const preamble = code.slice(lookbackStart, nodeFrom);
  const varMatch = preamble.match(
    /(?:const|let|var|this\.)\s*([a-zA-Z0-9_$]+)(?:\s*:\s*[^=]+)?\s*=\s*$/,
  );
  if (varMatch && varMatch[1]) return { name: varMatch[1], type: "variable" };
  const propMatch = preamble.match(/([a-zA-Z0-9_$]+)\s*:\s*$/);
  if (propMatch && propMatch[1])
    return { name: propMatch[1], type: "property" };
  return null;
}

export function resolveBreadcrumbs(
  tree: Tree,
  code: string,
  cursorPos: number,
): ScopeBlock[] {
  const scopes: ScopeBlock[] = [];

  try {
    let currentNode: SyntaxNode | null = tree.resolveInner(cursorPos, -1);
    const processedNodes = new Set<string>();

    while (currentNode) {
      const nodeType = currentNode.name;
      const mappedType = getScopeType(nodeType);
      const nodeKey = `${currentNode.from}-${nodeType}`;

      if (processedNodes.has(nodeKey)) {
        currentNode = currentNode.parent;
        continue;
      }

      //  Block Tier 0.5: Highly-Optimized Structural Scopes (conditional, looping, tcf)
      if (
        mappedType &&
        ["conditional", "looping", "tcf"].includes(mappedType)
      ) {
        let label = "";

        if (nodeType === "IfStatement") {
          // Detect 'else if' branch cleanly
          if (currentNode.parent?.name === "IfStatement") {
            label = "else if";
            // Anti-redundancy guard: Mark parent chain as parsed so it doesn't duplicate 'if' blocks
            processedNodes.add(`${currentNode.parent.from}-IfStatement`);
          } else {
            let elseToken = currentNode.firstChild;
            while (elseToken) {
              if (elseToken.name === "else") break;
              elseToken = elseToken.nextSibling;
            }

            if (elseToken && cursorPos >= elseToken.to) {
              let alternateNode = elseToken.nextSibling;
              while (alternateNode && alternateNode.name === "Comment") {
                alternateNode = alternateNode.nextSibling;
              }
              // If the alternate branch is not another IfStatement, it's a pure 'else' block
              if (alternateNode && alternateNode.name !== "IfStatement") {
                label = "else";
              } else {
                label = "if";
              }
            } else {
              label = "if";
            }
          }
        } else if (nodeType === "SwitchStatement") label = "switch";
        else if (nodeType === "ForStatement") label = "for";
        else if (nodeType === "ForInStatement") label = "for-in";
        else if (nodeType === "ForOfStatement") label = "for-of";
        else if (nodeType === "WhileStatement") label = "while";
        else if (nodeType === "DoStatement") label = "do";
        else if (nodeType === "TryStatement") label = "try";
        else if (nodeType === "CatchClause") label = "catch";
        else if (nodeType === "FinallyClause") label = "finally";

        if (label) {
          scopes.unshift({
            id: `${mappedType}-${currentNode.from}`,
            name: label,
            type: mappedType, // Directly maps to "conditional", "looping", or "tcf"
            from: currentNode.from,
            to: currentNode.to,
            line: 0,
          });
          processedNodes.add(nodeKey);
          currentNode = currentNode.parent;
          continue;
        }
      }
      // Block Tier 0.7: Event Listeners (addEventListener, removeEventListener)
      else if (nodeType === "CallExpression") {
        const calleeName = getCleanCallerName(currentNode.firstChild, code);
        if (
          calleeName &&
          (calleeName.endsWith("addEventListener") ||
            calleeName.endsWith("removeEventListener"))
        ) {
          const isAdd = calleeName.endsWith("addEventListener");
          const methodName = isAdd ? "addEventListener" : "removeEventListener";

          let eventType = "";
          const argList = currentNode.getChild("ArgList");
          if (argList) {
            let firstArg = argList.firstChild;
            if (firstArg && firstArg.name === "(") {
              firstArg = firstArg.nextSibling;
            }
            if (
              firstArg &&
              (firstArg.name === "String" || firstArg.name === "Literal")
            ) {
              const rawStr = code.slice(firstArg.from, firstArg.to).trim();
              eventType = rawStr.replace(/^['"`]|[ '"`]$/g, "");
            }
          }

          const displayName = eventType
            ? `${methodName}("${eventType}")`
            : methodName;

          scopes.unshift({
            id: `event-${currentNode.from}`,
            name: displayName,
            type: "event",
            from: currentNode.from,
            to: currentNode.to,
            line: 0,
          });
          processedNodes.add(nodeKey);
        }
      }
      // Block Tier 1: Anonymous Data Sets & Callbacks (Functions, Object Literals, Array Methods)
      else if (
        [
          "ObjectExpression",
          "ArrayExpression",
          "ArrowFunction",
          "FunctionExpression",
        ].includes(nodeType)
      ) {
        let nodeName: string | null = null;
        let typeOverride = mappedType || "function";

        let insideJSXAttribute = false;
        let checkJSX = currentNode.parent;
        while (checkJSX) {
          if (
            checkJSX.name === "JSXExpressionContainer" ||
            checkJSX.name === "JSXAttribute"
          ) {
            insideJSXAttribute = true;
            break;
          }
          if (
            [
              "FunctionDeclaration",
              "ClassDeclaration",
              "VariableDeclaration",
            ].includes(checkJSX.name)
          )
            break;
          checkJSX = checkJSX.parent;
        }
        if (insideJSXAttribute) {
          currentNode = currentNode.parent;
          continue;
        }

        const parent = currentNode.parent;
        if (
          parent &&
          (parent.name === "VariableDeclaration" ||
            parent.name === "Property" ||
            parent.name === "PropertyDeclaration" ||
            parent.name === "AssignmentExpression")
        ) {
          nodeName =
            parent.name === "AssignmentExpression"
              ? getCleanCallerName(parent.firstChild, code)
              : getIdentifierName(parent, code);

          if (nodeName) {
            if (
              parent.name === "AssignmentExpression" &&
              (nodeType === "FunctionExpression" ||
                nodeType === "ArrowFunction")
            ) {
              typeOverride = "method";
            }
            scopes.unshift({
              id: `${typeOverride}-${currentNode.from}`,
              name: nodeName,
              type: typeOverride,
              from: currentNode.from,
              to: currentNode.to,
              line: 0,
            });
            processedNodes.add(`${parent.from}-${parent.name}`);
            if (currentNode.parent)
              processedNodes.add(
                `${currentNode.parent.from}-${currentNode.parent.name}`,
              );
          }
        }

        if (!nodeName && nodeType === "FunctionExpression") {
          nodeName = getIdentifierName(currentNode, code);
          if (nodeName) {
            scopes.unshift({
              id: `${typeOverride}-${currentNode.from}`,
              name: nodeName,
              type: typeOverride,
              from: currentNode.from,
              to: currentNode.to,
              line: 0,
            });
          }
        }

        if (!nodeName) {
          const fallback = getLookbackName(currentNode.from, code);
          if (fallback) {
            scopes.unshift({
              id: `${typeOverride}-${currentNode.from}`,
              name: fallback.name,
              type: typeOverride,
              from: currentNode.from,
              to: currentNode.to,
              line: 0,
            });
          } else if (
            nodeType === "ArrowFunction" ||
            nodeType === "FunctionExpression"
          ) {
            let isStandardCallback = false;
            let callbackLabel = "&lt;function&gt;";
            let parentNode = currentNode.parent;

            if (parentNode && parentNode.name === "ArgList") {
              let grandparent = parentNode.parent;
              if (grandparent && grandparent.name === "CallExpression") {
                const memberExpr = grandparent.getChild("MemberExpression");
                if (memberExpr) {
                  const propNode =
                    memberExpr.getChild("PropertyName") ||
                    memberExpr.getChild("Identifier");
                  if (propNode) {
                    const methodName = code
                      .slice(propNode.from, propNode.to)
                      .trim();
                    const validCallbacks = [
                      "filter",
                      "map",
                      "reduce",
                      "forEach",
                      "then",
                      "catch",
                      "finally",
                      "some",
                      "every",
                      "find",
                      "findIndex",
                      "flatMap",
                    ];
                    if (validCallbacks.includes(methodName)) {
                      isStandardCallback = true;

                      const leftObj = memberExpr.firstChild;
                      if (
                        leftObj &&
                        (leftObj.name === "VariableName" ||
                          leftObj.name === "Identifier" ||
                          leftObj.name === "this")
                      ) {
                        const callerName = code
                          .slice(leftObj.from, leftObj.to)
                          .trim();
                        callbackLabel = `${callerName}.${methodName}() callback`;
                      } else if (
                        leftObj &&
                        leftObj.name === "MemberExpression"
                      ) {
                        const cleanLeft = getCleanCallerName(leftObj, code);
                        if (cleanLeft && !cleanLeft.includes("(")) {
                          callbackLabel = `${cleanLeft}.${methodName}() callback`;
                        } else {
                          callbackLabel = `${methodName}() callback`;
                        }
                      } else {
                        callbackLabel = `${methodName}() callback`;
                      }
                    }
                  }
                }
              }
            }

            if (isStandardCallback) {
              scopes.unshift({
                id: `callback-${currentNode.from}`,
                name: callbackLabel,
                type: typeOverride,
                from: currentNode.from,
                to: currentNode.to,
                line: 0,
              });
            } else {
              let p1 = currentNode.parent;
              if (p1 && p1.name === "ParenthesizedExpression") p1 = p1.parent;
              const isAnonymousIIFE = p1 && p1.name === "CallExpression";

              if (!isAnonymousIIFE) {
                scopes.unshift({
                  id: `${typeOverride}-${currentNode.from}`,
                  name: "&lt;cb function&gt;",
                  type: "arrow",
                  from: currentNode.from,
                  to: currentNode.to,
                  line: 0,
                });
              }
            }
          }
        }
      }
      // Block Tier 2: Structural Scopes (Classes, Methods, Variable Declarations)
      else if (mappedType) {
        let nodeName: string | null = null;
        if (
          ["class", "interface", "type", "enum", "function", "method"].includes(
            mappedType,
          )
        ) {
          nodeName = getIdentifierName(currentNode, code);

          if (
            nodeName &&
            (nodeType === "MethodDeclaration" ||
              nodeType === "Property" ||
              nodeType === "PropertyDeclaration")
          ) {
            let child = currentNode.firstChild;
            while (child) {
              if (directNameTokens.includes(child.name)) {
                const prefixText = code.slice(currentNode.from, child.from);
                if (/\bget\b/.test(prefixText)) nodeName = `(get) ${nodeName}`;
                else if (/\bset\b/.test(prefixText))
                  nodeName = `(set) ${nodeName}`;
                break;
              }
              child = child.nextSibling;
            }
          }
        } else if (
          nodeType === "VariableDeclaration" ||
          nodeType === "AssignmentExpression"
        ) {
          nodeName =
            nodeType === "AssignmentExpression"
              ? getCleanCallerName(currentNode.firstChild, code)
              : getIdentifierName(currentNode, code);

          if (nodeName) {
            scopes.unshift({
              id: `variable-${currentNode.from}`,
              name: nodeName,
              type: "variable",
              from: currentNode.from,
              to: currentNode.to,
              line: 0,
            });
          }
        } else if (
          nodeType === "Property" ||
          nodeType === "PropertyDeclaration"
        ) {
          nodeName = getIdentifierName(currentNode, code);
          if (nodeName) {
            let child = currentNode.firstChild;
            while (child) {
              if (directNameTokens.includes(child.name)) {
                const prefixText = code.slice(currentNode.from, child.from);
                if (/\bget\b/.test(prefixText)) nodeName = `(get) ${nodeName}`;
                else if (/\bset\b/.test(prefixText))
                  nodeName = `(set) ${nodeName}`;
                break;
              }
              child = child.nextSibling;
            }

            let finalType = currentNode.getChild("Block")
              ? "method"
              : "property";
            scopes.unshift({
              id: `${finalType}-${currentNode.from}`,
              name: nodeName,
              type: finalType,
              from: currentNode.from,
              to: currentNode.to,
              line: 0,
            });
          }
        } else if (mappedType === "jsx") {
          nodeName = getJSXTagName(currentNode, code, cursorPos);
          if (nodeName && !/^[A-Z]/.test(nodeName)) {
            nodeName = null;
          }
        }

        if (
          nodeName &&
          ![
            "Property",
            "PropertyDeclaration",
            "VariableDeclaration",
            "AssignmentExpression",
          ].includes(nodeType)
        ) {
          scopes.unshift({
            id: `${mappedType}-${currentNode.from}`,
            name: nodeName,
            type: mappedType,
            from: currentNode.from,
            to: currentNode.to,
            line: 0,
          });
        }
      }
      currentNode = currentNode.parent;
    }

    // High-Performance Binary Search Line Resolver Block
    if (scopes.length > 0) {
      const lineStarts: number[] = [0];
      const codeLen = code.length;
      for (let i = 0; i < codeLen; i++) {
        if (code.charCodeAt(i) === 10) {
          lineStarts.push(i + 1);
        }
      }

      for (let i = 0; i < scopes.length; i++) {
        const targetOffset = scopes[i].from;
        let low = 0;
        let high = lineStarts.length - 1;

        while (low <= high) {
          const mid = (low + high) >> 1;
          if (lineStarts[mid] === targetOffset) {
            low = mid + 1;
            break;
          } else if (lineStarts[mid] < targetOffset) {
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
        scopes[i].line = low;
      }
    }
  } catch (err) {
    console.error("Breadcrumbs Error:", err);
  }

  return scopes;
}

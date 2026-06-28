import { parser as jsParser } from "@lezer/javascript";
import { SyntaxNode } from "@lezer/common";

const parser = jsParser.configure({ dialect: "ts jsx" });

export interface ScopeBlock {
  id: string;
  name: string;
  type: string;
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
      return "function";
    case "MethodDeclaration":
    case "MethodType":
      return "method";
    case "StaticBlock":
      return "static-block";
    case "JSXElement":
      return "jsx";
    case "ForStatement":
    case "WhileStatement":
    case "DoStatement":
      return "looping";
    case "SwitchStatement":
    case "IfStatement":
      return "conditional";
    case "TryStatement":
    case "CatchClause":
    case "FinallyClause":
      return "try-catch-finally";
    case "ObjectExpression":
      return "object";
    case "ArrayExpression":
      return "array";
    case "ArrowFunction":
      return "arrow";
    case "FunctionExpression":
      return "function";
    case "Property":
    case "PropertyDeclaration":
      return "property";
    case "VariableDeclarator":
      return "variable";
    default:
      return null;
  }
}

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

  const directNameTokens = [
    "VariableDefinition",
    "TypeDefinition",
    "PropertyDefinition",
    "PrivatePropertyDefinition",
    "PrivatePropertyName",
    "PropertyName",
    "JSXIdentifier",
    "JSXBuiltinIdentifier",
    "VariableName",
    "Identifier",
  ];

  let child = node.firstChild;
  while (child) {
    if (directNameTokens.includes(child.name)) {
      return code.slice(child.from, child.to).trim();
    }
    child = child.nextSibling;
  }
  return null;
}

function getParamName(node: SyntaxNode, code: string): string | null {
  const paramList = node.getChild("ParamList");
  if (paramList) {
    const firstParam =
      paramList.getChild("VariableDefinition") ||
      paramList.getChild("Identifier");
    if (firstParam) return code.slice(firstParam.from, firstParam.to).trim();
  }
  const directParam = node.getChild("VariableDefinition");
  if (directParam) return code.slice(directParam.from, directParam.to).trim();
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
  code: string,
  cursorPos: number,
): ScopeBlock[] {
  const scopes: ScopeBlock[] = [];

  try {
    const tree = parser.parse(code);
    let currentNode: SyntaxNode | null = tree.resolveInner(cursorPos, -1);
    let caughtClause = false;
    let hasCapturedMethodChain = false;
    const processedNodes = new Set<string>(); // Upgraded to string Composite Key set

    while (currentNode) {
      const nodeType = currentNode.name;
      const mappedType = getScopeType(nodeType);
      const nodeKey = `${currentNode.from}-${nodeType}`;

      if (processedNodes.has(nodeKey)) {
        currentNode = currentNode.parent;
        continue;
      }

      // Block Tier 1: Exception Handlers
      if (nodeType === "FinallyClause") {
        caughtClause = true;
        scopes.unshift({
          id: `finally-${currentNode.from}`,
          name: "finally",
          type: "try-catch-finally",
          from: currentNode.from,
          to: currentNode.to,
          line: 0, // Deferred allocation
        });
      } else if (nodeType === "CatchClause") {
        caughtClause = true;
        scopes.unshift({
          id: `catch-${currentNode.from}`,
          name: "catch",
          type: "try-catch-finally",
          from: currentNode.from,
          to: currentNode.to,
          line: 0,
        });
      } else if (nodeType === "TryStatement") {
        if (!caughtClause) {
          scopes.unshift({
            id: `try-${currentNode.from}`,
            name: "try",
            type: "try-catch-finally",
            from: currentNode.from,
            to: currentNode.to,
            line: 0,
          });
        }
        caughtClause = false;
      }
      // Block Tier 2: Pipelines & Expressions
      else if (nodeType === "CallExpression") {
        const memberExpr = currentNode.getChild("MemberExpression");
        if (memberExpr) {
          const propNode = memberExpr.getChild("PropertyName");
          if (propNode) {
            const methodName = code.slice(propNode.from, propNode.to).trim();
            if (methodName === "addEventListener") {
              const leftNode = memberExpr.firstChild;
              const callerName = leftNode
                ? getCleanCallerName(leftNode, code)
                : "window";
              scopes.unshift({
                id: `listener-${currentNode.from}`,
                name: callerName
                  ? `${callerName}.addEventListener`
                  : "addEventListener",
                type: "listener",
                from: currentNode.from,
                to: currentNode.to,
                line: 0,
              });
            } else if (
              [
                "filter",
                "map",
                "reduce",
                "forEach",
                "then",
                "catch",
                "finally",
                "split",
                "join",
              ].includes(methodName)
            ) {
              if (!hasCapturedMethodChain) {
                const leftNode = memberExpr.firstChild;
                const callerName = leftNode
                  ? getCleanCallerName(leftNode, code)
                  : null;
                const displayName =
                  callerName && callerName !== "return"
                    ? `${callerName}.${methodName}`
                    : `.${methodName}`;
                scopes.unshift({
                  id: `method-chain-${currentNode.from}`,
                  name: displayName,
                  type: "method-chain",
                  from: currentNode.from,
                  to: currentNode.to,
                  line: 0,
                });
                hasCapturedMethodChain = true;
              }
            }
          }
        } else {
          const calleeNode = currentNode.firstChild;
          if (calleeNode) {
            const calleeName = code
              .slice(calleeNode.from, calleeNode.to)
              .trim();
            if (
              [
                "Date",
                "Math",
                "Set",
                "Map",
                "Array",
                "Object",
                "String",
                "Number",
                "Boolean",
              ].includes(calleeName) ||
              calleeNode.name === "VariableName" ||
              calleeNode.name === "Identifier"
            ) {
              scopes.unshift({
                id: `function-${currentNode.from}`,
                name: `${calleeName}()`,
                type: "function",
                from: currentNode.from,
                to: currentNode.to,
                line: 0,
              });
            }
          }
        }
      }
      // Block Tier 3: Anonymous Data Sets & Callbacks
      else if (
        [
          "ObjectExpression",
          "ArrayExpression",
          "ArrowFunction",
          "FunctionExpression",
        ].includes(nodeType)
      ) {
        let nodeName: string | null = null;
        let typeOverride = mappedType!;
        if (nodeType === "ObjectExpression") typeOverride = "object";
        else if (nodeType === "ArrayExpression") typeOverride = "array";
        else if (nodeType === "ArrowFunction") typeOverride = "arrow";
        else if (nodeType === "FunctionExpression") typeOverride = "function";

        let parent = currentNode.parent;
        if (parent && parent.name === "VariableDeclaration") {
          parent = parent.getChild("VariableDeclarator") || parent;
        }

        if (
          parent &&
          (parent.name === "VariableDeclarator" ||
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
            let parentNode = currentNode.parent;

            if (parentNode && parentNode.name === "ArgList") {
              let grandparent = parentNode.parent;
              if (grandparent && grandparent.name === "CallExpression") {
                const memberExpr = grandparent.getChild("MemberExpression");
                if (memberExpr) {
                  const propNode = memberExpr.getChild("PropertyName");
                  if (propNode) {
                    const methodName = code
                      .slice(propNode.from, propNode.to)
                      .trim();
                    if (
                      [
                        "filter",
                        "map",
                        "reduce",
                        "forEach",
                        "then",
                        "catch",
                        "finally",
                        "split",
                        "join",
                        "addEventListener",
                      ].includes(methodName)
                    ) {
                      isStandardCallback = true;
                    }
                  }
                }
              }
            }

            if (parentNode && parentNode.name === "JSXExpressionContainer") {
              if (
                parentNode.parent &&
                parentNode.parent.name === "JSXAttribute"
              ) {
                isStandardCallback = true;
              }
            }

            if (!isStandardCallback) {
              const paramName = getParamName(currentNode, code);
              scopes.unshift({
                id: `${typeOverride}-${currentNode.from}`,
                name: paramName ? paramName : "anonymous",
                type: typeOverride,
                from: currentNode.from,
                to: currentNode.to,
                line: 0,
              });
            }
          }
        }
      }
      // Block Tier 4: Structural Scopes
      else if (mappedType) {
        let nodeName: string | null = null;
        if (
          ["class", "interface", "type", "enum", "function", "method"].includes(
            mappedType,
          )
        ) {
          nodeName = getIdentifierName(currentNode, code);
        } else if (nodeType === "VariableDeclarator") {
          nodeName = getIdentifierName(currentNode, code);
          if (nodeName) {
            const childExpr =
              currentNode.getChild("ObjectExpression") ||
              currentNode.getChild("ArrowFunction") ||
              currentNode.getChild("FunctionExpression") ||
              currentNode.getChild("ArrayExpression");
            if (childExpr) {
              currentNode = currentNode.parent;
              continue;
            }
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
        } else if (mappedType === "static-block") {
          nodeName = "static {}";
        } else if (mappedType === "jsx") {
          nodeName = getJSXTagName(currentNode, code, cursorPos);
        } else if (
          ["conditional", "looping", "try-catch-finally"].includes(
            mappedType,
          ) &&
          nodeType !== "TryStatement"
        ) {
          if (nodeType === "IfStatement") {
            const parentElse = currentNode.getChild("else");
            const childIf = currentNode.getChild("IfStatement");
            if (
              parentElse &&
              childIf &&
              childIf.from > parentElse.from &&
              cursorPos >= parentElse.from
            ) {
              currentNode = currentNode.parent;
              continue;
            }

            const elseKeywordNode = currentNode.getChild("else");
            if (elseKeywordNode && cursorPos >= elseKeywordNode.from) {
              nodeName = "else";
            } else {
              const parentNode = currentNode.parent;
              const isElseIfStructure =
                parentNode &&
                parentNode.name === "IfStatement" &&
                currentNode.from >
                  (parentNode.getChild("else")?.from ?? Infinity);
              nodeName = isElseIfStructure ? "else-if" : "if";
            }
          } else {
            nodeName = nodeType
              .replace("Statement", "")
              .replace("Clause", "")
              .toLowerCase();
            if (nodeName === "catchclause") nodeName = "catch";
          }
        }

        if (
          nodeName &&
          !["Property", "PropertyDeclaration", "VariableDeclarator"].includes(
            nodeType,
          )
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

    // --- Enterprise Single-Pass Stream-Scanning Line Counter ($O(N)$ Optimization) ---
    if (scopes.length > 0) {
      let currentLine = 1;
      let streamIdx = 0;
      const totalLen = code.length;

      // scopes array သည် unshift ဖြင့်ဆောက်ထား၍ Outer-most မှ Inner-most သို့ 'from' တန်ဖိုးအလိုက် အစဉ်လိုက် (Sorted) ဖြစ်နေပြီးသားဖြစ်သည်
      for (let i = 0; i < scopes.length; i++) {
        const targetOffset = scopes[i].from;

        // တစ်ကြိမ်တည်းဖြင့် ရှေ့သို့သာ ဆက်တိုက် Scan ဖတ်သွားသည့် Pointer စနစ်
        while (streamIdx < targetOffset && streamIdx < totalLen) {
          if (code[streamIdx] === "\n") {
            currentLine++;
          }
          streamIdx++;
        }
        scopes[i].line = currentLine;
      }
    }
  } catch (err) {
    console.error("Breadcrumbs Error:", err);
  }

  return scopes;
}

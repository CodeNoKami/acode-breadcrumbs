import { SyntaxNode, Tree } from "@lezer/common";

export interface ScopeBlock {
  id: string;
  name: string;
  type: string; // class, interface, type, enum, function, method, jsx, object, array, property, variable, control-flow, looping, tcf, method-chain, listener
  from: number;
  to: number;
  line: number;
}

/**
 * Maps Lezer AST core nodes directly to the Breadcrumbs Premium Neon Scopes
 */
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
      return "method";
    case "JSXElement":
    case "JSXSelfClosingTag":
      return "jsx";
    case "ObjectExpression":
      return "object";
    case "ArrayExpression":
      return "array";
    case "Property":
    case "PropertyDefinition":
    case "FieldDeclaration":
      return "property";
    case "VariableDeclaration":
    case "AssignmentExpression":
      return "variable";

    // Premium UI Control Flow (Decision Diamond Shape)
    case "IfStatement":
    case "SwitchStatement":
    case "ConditionalExpression": // Ternary operators (? :)
      return "conditional";

    // Premium UI Looping (Circular Rotation Arrow Shape)
    case "ForStatement": // Lezer standardizes all loops (for, for-in, for-of) here
    case "WhileStatement":
    case "DoStatement":
      return "looping";

    // Try-Catch-Finally Blocks
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

      // 1. ADVANCED CONTEXTUAL SCOPE PROCESSING (Listeners & Method Chains)
      if (nodeType === "CallExpression") {
        const callee = currentNode.firstChild;
        if (callee && callee.name === "MemberExpression") {
          const propNode =
            callee.getChild("PropertyName") || callee.getChild("Identifier");
          if (propNode) {
            const methodName = code.slice(propNode.from, propNode.to).trim();
            const listenerHooks = [
              "addEventListener",
              "on",
              "off",
              "once",
              "subscribe",
              "watch",
            ];

            // A: Listener Detection
            if (listenerHooks.includes(methodName)) {
              let eventType = "";
              const argList = currentNode.getChild("ArgList");
              if (argList) {
                let firstArg = argList.firstChild;
                if (firstArg && firstArg.name === "(")
                  firstArg = firstArg.nextSibling;
                if (
                  firstArg &&
                  (firstArg.name === "String" || firstArg.name === "Literal")
                ) {
                  eventType = code
                    .slice(firstArg.from, firstArg.to)
                    .trim()
                    .replace(/^['"`]|[ '"`]$/g, "");
                }
              }
              const callerPrefix =
                getCleanCallerName(callee.firstChild, code) || "";
              const displayName = eventType
                ? `${callerPrefix ? callerPrefix + "." : ""}${methodName}("${eventType}")`
                : `${callerPrefix ? callerPrefix + "." : ""}${methodName}()`;

              scopes.unshift({
                id: `listener-${currentNode.from}`,
                name: displayName,
                type: "listener",
                from: currentNode.from,
                to: currentNode.to,
                line: 0,
              });
              processedNodes.add(nodeKey);
              currentNode = currentNode.parent;
              continue;
            }

            // B: Fluid Cascading Method Chain Detection (Preventing Duplications)
            if (
              callee.firstChild &&
              callee.firstChild.name === "CallExpression"
            ) {
              scopes.unshift({
                id: `method-chain-${currentNode.from}`,
                name: `${methodName}()`,
                type: "method-chain",
                from: currentNode.from,
                to: currentNode.to,
                line: 0,
              });
              processedNodes.add(nodeKey);
              currentNode = currentNode.parent;
              continue;
            }
          }
        }
      }

      // 2. BLOCK TIER: Control Flow & Loops (The Lezer Ghost Node Fix)
      if (
        mappedType &&
        ["conditional", "looping", "tcf"].includes(mappedType)
      ) {
        let label = "";

        if (nodeType === "IfStatement") {
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
            if (alternateNode && alternateNode.name === "IfStatement") {
              currentNode = currentNode.parent;
              continue;
            } else {
              label = "else";
            }
          } else {
            if (
              currentNode.parent &&
              currentNode.parent.name === "IfStatement"
            ) {
              label = "else if";
              processedNodes.add(`${currentNode.parent.from}-IfStatement`);
            } else {
              label = "if";
            }
          }
        } else if (nodeType === "SwitchStatement") label = "switch";
        else if (nodeType === "WhileStatement") label = "while";
        else if (nodeType === "DoStatement") label = "do-while";
        else if (nodeType === "ForStatement") {
          if (currentNode.getChild("ForInSpec")) label = "for-in";
          else if (currentNode.getChild("ForOfSpec")) label = "for-of";
          else label = "for";
        } else if (nodeType === "TryStatement") {
          label = "try";
          let checkChild = currentNode.firstChild;
          let isCursorInTcfSibling = false;
          while (checkChild) {
            if (
              (checkChild.name === "CatchClause" ||
                checkChild.name === "FinallyClause") &&
              cursorPos >= checkChild.from &&
              cursorPos <= checkChild.to
            ) {
              isCursorInTcfSibling = true;
              break;
            }
            checkChild = checkChild.nextSibling;
          }
          if (isCursorInTcfSibling) {
            currentNode = currentNode.parent;
            continue;
          }
        } else if (nodeType === "CatchClause") label = "catch";
        else if (nodeType === "FinallyClause") label = "finally";

        if (label) {
          scopes.unshift({
            id: `${mappedType}-${currentNode.from}`,
            name: label,
            type: mappedType,
            from: currentNode.from,
            to: currentNode.to,
            line: 0,
          });
          processedNodes.add(nodeKey);
          currentNode = currentNode.parent;
          continue;
        }
      }

      // 3. ANONYMOUS DATA SETS & CALLBACKS CLOSURES
      if (
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

        // --- FIXED: ADVANCED METHOD CHAIN RECURSIVE ANCHOR SEARCH ---
        if (parent && parent.name === "ArgList") {
          let topAnchor: SyntaxNode | null = parent.parent; // Current CallExpression
          let firstCallee: SyntaxNode | null = null;

          // Climb up through the entire fluent chain layers to find the top-most CallExpression
          while (topAnchor && topAnchor.parent) {
            const pName = topAnchor.parent.name;
            if (
              pName === "MemberExpression" ||
              pName === "CallExpression" ||
              pName === "ArgList"
            ) {
              topAnchor = topAnchor.parent;
            } else {
              break;
            }
          }

          // Chain ရဲ့ အစပြုရာ Root Object (ဥပမာ- transactions) ကို အောက်ဆုံးထိ ပြန်ဆင်းရှာမယ်
          if (topAnchor && topAnchor.name === "CallExpression") {
            let baseNode: SyntaxNode | null = topAnchor;
            while (baseNode && baseNode.name === "CallExpression") {
              const callee: any = baseNode.firstChild;
              if (callee && callee.name === "MemberExpression") {
                baseNode = callee.firstChild; // Member expression ရဲ့ ဘယ်ဘက်ခြမ်းကို ဖမ်းမယ်
              } else {
                baseNode = callee;
                break;
              }
            }
            firstCallee = baseNode;
          }

          if (topAnchor) {
            // Variable name အစား စတင်ခေါ်ယူတဲ့ Object/Array နာမည်ကို တိုက်ရိုက်ရယူမယ်
            let rootName = firstCallee
              ? getCleanCallerName(firstCallee, code)
              : null;

            // Extract the direct method identity handling this specific callback (e.g., map, filter)
            const currentCall = parent.parent;
            let currentMethodName = "";
            if (currentCall && currentCall.name === "CallExpression") {
              const memExpr = currentCall.getChild("MemberExpression");
              const propNode =
                memExpr?.getChild("PropertyName") ||
                memExpr?.getChild("Identifier");
              if (propNode) {
                currentMethodName = code
                  .slice(propNode.from, propNode.to)
                  .trim();
              }
            }

            if (rootName && currentMethodName) {
              nodeName = `${rootName}.${currentMethodName}() cb`;
            } else if (currentMethodName) {
              nodeName = `${currentMethodName}() cb`;
            }

            if (nodeName) {
              scopes.unshift({
                id: `callback-${currentNode.from}`,
                name: nodeName,
                type: "function",
                from: currentNode.from,
                to: currentNode.to,
                line: 0,
              });

              // Register and blacklist all middle redundant call expression nodes from inflating the trail
              let jumpNode: SyntaxNode | null = currentNode.parent;
              while (jumpNode && jumpNode.from >= topAnchor.from) {
                processedNodes.add(`${jumpNode.from}-${jumpNode.name}`);
                jumpNode = jumpNode.parent;
              }

              processedNodes.add(nodeKey);
              currentNode = topAnchor.parent || currentNode.parent;
              continue;
            }
          }
        }
        // --- END FIXED METHOD CHAIN JUMPER ---

        if (
          parent &&
          (parent.name === "VariableDeclaration" ||
            parent.name === "Property" ||
            parent.name === "PropertyDefinition" ||
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
            processedNodes.add(nodeKey);
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
            let p1 = currentNode.parent;
            if (p1 && p1.name === "ParenthesizedExpression") p1 = p1.parent;
            const isAnonymousIIFE = p1 && p1.name === "CallExpression";

            if (!isAnonymousIIFE) {
              scopes.unshift({
                id: `${typeOverride}-${currentNode.from}`,
                name: "&lt;cb function&gt;",
                type: "function",
                from: currentNode.from,
                to: currentNode.to,
                line: 0,
              });
            }
          }
        }
      }

      // 4. MAIN STRUCTURAL OBJECT-ORIENTED SIGNATURES
      else if (mappedType) {
        let nodeName: string | null = null;
        if (
          ["class", "interface", "type", "enum", "function", "method"].includes(
            mappedType,
          )
        ) {
          nodeName = getIdentifierName(currentNode, code);

          if (nodeName && nodeType === "MethodDeclaration") {
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
          nodeType === "PropertyDefinition"
        ) {
          nodeName = getIdentifierName(currentNode, code);
          if (nodeName) {
            let child = currentNode.firstChild;
            while (child) {
              if (child.name === "get" || child.name === "set") {
                nodeName = `(${child.name}) ${nodeName}`;
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
          if (nodeName && !/^[A-Z]/.test(nodeName.split(".")[0])) {
            nodeName = null; // Filters native lower-cased tags out (e.g. div, sections)
          }
        }

        if (
          nodeName &&
          ![
            "Property",
            "PropertyDefinition",
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

    // 5. OPTIMIZED OFFSET-TO-LINE RESOLVER (BINARY SEARCH)
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
        let lineNum = 1;

        while (low <= high) {
          const mid = (low + high) >> 1;
          if (lineStarts[mid] <= targetOffset) {
            lineNum = mid + 1;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
        scopes[i].line = lineNum;
      }
    }
  } catch (err) {
    console.error("Acode Breadcrumbs Core Parser Error:", err);
  }

  console.log(scopes);

  return scopes;
}

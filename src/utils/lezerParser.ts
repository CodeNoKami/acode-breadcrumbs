import { parser as jsParser } from "@lezer/javascript";
import { SyntaxNode } from "@lezer/common";

const parser = jsParser.configure({ dialect: "ts jsx" });

export interface ScopeBlock {
  name: string;
  type: string;
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
    if (firstParam) {
      return code.slice(firstParam.from, firstParam.to).trim();
    }
  }
  const directParam = node.getChild("VariableDefinition");
  if (directParam) {
    return code.slice(directParam.from, directParam.to).trim();
  }
  return null;
}

function getCleanCallerName(
  node: SyntaxNode | null,
  code: string,
): string | null {
  if (!node) return null;
  if (
    node.name === "VariableName" ||
    node.name === "Identifier" ||
    node.name === "this"
  ) {
    return code.slice(node.from, node.to).trim();
  }
  if (node.name === "MemberExpression") {
    const left = node.firstChild;
    const right =
      node.getChild("PropertyName") ||
      node.getChild("Identifier") ||
      node.lastChild;
    if (left && right) {
      const leftName = getCleanCallerName(left, code);
      const rightName = code.slice(right.from, right.to).trim();
      return leftName ? `${leftName}.${rightName}` : rightName;
    }
  }
  if (node.name === "CallExpression") {
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
        const attrName = code.slice(attrNameNode.from, attrNameNode.to).trim();
        return `${tagName}.${attrName}`;
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
    const processedNodes = new Set<number>();

    while (currentNode) {
      const nodeType = currentNode.name;
      const mappedType = getScopeType(nodeType);

      if (processedNodes.has(currentNode.from)) {
        currentNode = currentNode.parent;
        continue;
      }

      if (nodeType === "FinallyClause") {
        caughtClause = true;
        scopes.unshift({ name: "finally", type: "try-catch-finally" });
      } else if (nodeType === "CatchClause") {
        caughtClause = true;
        scopes.unshift({ name: "catch", type: "try-catch-finally" });
      } else if (nodeType === "TryStatement") {
        if (!caughtClause)
          scopes.unshift({ name: "try", type: "try-catch-finally" });
        caughtClause = false;
      } else if (nodeType === "CallExpression") {
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
                name: callerName
                  ? `${callerName}.addEventListener`
                  : "addEventListener",
                type: "listener",
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
                scopes.unshift({ name: displayName, type: "method-chain" });
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
              scopes.unshift({ name: `${calleeName}()`, type: "function" });
            }
          }
        }
      } else if (
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
        if (parent && parent.name === "VariableDeclaration")
          parent = parent.getChild("VariableDeclarator") || parent;

        if (
          parent &&
          (parent.name === "VariableDeclarator" ||
            parent.name === "Property" ||
            parent.name === "PropertyDeclaration" ||
            parent.name === "AssignmentExpression")
        ) {
          if (parent.name === "AssignmentExpression") {
            nodeName = getCleanCallerName(parent.firstChild, code);
          } else {
            nodeName = getIdentifierName(parent, code);
          }

          if (nodeName) {
            if (
              parent.name === "AssignmentExpression" &&
              (nodeType === "FunctionExpression" ||
                nodeType === "ArrowFunction")
            ) {
              typeOverride = "method";
            }
            scopes.unshift({ name: nodeName, type: typeOverride });
            processedNodes.add(parent.from);
            processedNodes.add(
              currentNode.parent ? currentNode.parent.from : 0,
            );
          }
        }

        if (!nodeName && nodeType === "FunctionExpression") {
          nodeName = getIdentifierName(currentNode, code);
          if (nodeName) scopes.unshift({ name: nodeName, type: typeOverride });
        }

        if (!nodeName) {
          const fallback = getLookbackName(currentNode.from, code);
          if (fallback) {
            scopes.unshift({ name: fallback.name, type: typeOverride });
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
              // ✨ ပြင်ဆင်လိုက်သည့်အပိုင်း: နာမည်မရှိသော Arrow Function များကို "anonymous" ဟု ပြောင်းလဲသတ်မှတ်ခြင်း
              const defaultName = paramName ? paramName : "anonymous";
              scopes.unshift({ name: defaultName, type: typeOverride });
            }
          }
        }
      } else if (mappedType) {
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
            scopes.unshift({ name: nodeName, type: "variable" });
          }
        } else if (
          nodeType === "Property" ||
          nodeType === "PropertyDeclaration"
        ) {
          nodeName = getIdentifierName(currentNode, code);
          if (nodeName) {
            let finalType = "property";
            if (currentNode.getChild("Block")) finalType = "method";
            scopes.unshift({ name: nodeName, type: finalType });
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
            const isFlatElseIfChain =
              parentElse && childIf && childIf.from > parentElse.from;

            if (isFlatElseIfChain && cursorPos >= parentElse.from) {
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
              if (isElseIfStructure) nodeName = "else-if";
              else nodeName = "if";
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
          scopes.unshift({ name: nodeName, type: mappedType });
        }
      }
      currentNode = currentNode.parent;
    }
  } catch (err) {
    console.error("Breadcrumbs Error:", err);
  }

  return scopes;
}

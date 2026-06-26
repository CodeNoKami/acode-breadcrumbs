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
    case "AmbientFunctionDeclaration":
    case "FunctionDeclaration":
    case "FunctionExpression":
      return "function";
    case "MethodDeclaration":
    case "MethodType":
      return "method";
    case "ArrowFunction":
      return "arrow";
    case "StaticBlock":
      return "static-block";
    case "JSXElement":
      return "jsx";
    case "ForStatement":
    case "WhileStatement":
    case "DoStatement":
    case "SwitchStatement":
    case "IfStatement":
    case "TryStatement":
    case "CatchClause":
      return "control-flow";
    case "ArrayExpression":
      return "array";
    case "ObjectExpression":
      return "object";
    default:
      return null;
  }
}

function getIdentifierName(node: SyntaxNode, code: string): string | null {
  if (!node) return null;

  const directNameTokens = [
    "VariableDefinition",
    "TypeDefinition",
    "PropertyDefinition",
    "PrivatePropertyDefinition",
    "PropertyName",
    "JSXIdentifier",
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

function getJSXTagName(node: SyntaxNode, code: string): string | null {
  const tagNode =
    node.getChild("JSXOpenTag") || node.getChild("JSXSelfClosingTag");
  if (!tagNode) return null;
  const identifier =
    tagNode.getChild("JSXOpenTag")?.getChild("JSXIdentifier") ||
    tagNode.getChild("JSXSelfClosingTag")?.getChild("JSXIdentifier");
  if (identifier) return code.slice(identifier.from, identifier.to).trim();
  return "JSX";
}

/**
 * 🛠️ Helper 1: AST Level Dynamic Root Identifier Extractor
 * Chaining ဖြစ်နေသော CallExpression (e.g., rawItems.filter().map()) များမှ
 * အရင်းမြစ်ဆုံး Object Name (rawItems) ကို AST အတိုင်းသာ လိုက်လံရှာဖွေပေးသည်။
 */
function findRootCallerName(node: SyntaxNode, code: string): string | null {
  if (!node) return null;

  if (node.name === "VariableName" || node.name === "Identifier") {
    return code.slice(node.from, node.to).trim();
  }

  if (node.name === "MemberExpression") {
    const firstChild = node.firstChild;
    if (firstChild) return findRootCallerName(firstChild, code);
  }

  if (node.name === "CallExpression") {
    const callee = node.getChild("MemberExpression") || node.firstChild;
    if (callee) return findRootCallerName(callee, code);
  }

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

    while (currentNode) {
      const nodeType = currentNode.name;
      const mappedType = getScopeType(nodeType);

      if (nodeType === "TryStatement") {
        const hasCatchOrFinally = scopes.some(
          (s) => s.type === "catch" || s.name === "catch",
        );
        if (hasCatchOrFinally) {
          currentNode = currentNode.parent;
          continue;
        }
      }

      if (mappedType) {
        let nodeName: string | null = null;
        let typeOverride = mappedType;

        if (
          ["class", "interface", "type", "enum", "function", "method"].includes(
            mappedType,
          )
        ) {
          nodeName = getIdentifierName(currentNode, code);

          if (
            !nodeName &&
            (nodeType === "FunctionExpression" || nodeType === "ArrowFunction")
          ) {
            let parent = currentNode.parent;
            if (
              parent &&
              (parent.name === "Property" ||
                parent.name === "PropertyDeclaration")
            ) {
              nodeName = getIdentifierName(parent, code);
            }
          }
        } else if (mappedType === "static-block") {
          nodeName = "static {}";
        } else if (mappedType === "jsx") {
          nodeName = getJSXTagName(currentNode, code);
        } else if (mappedType === "control-flow") {
          if (nodeType === "IfStatement") {
            // 🎯 Child-Priority Check: အတွင်းထဲက block တစ်ခုကို မိပြီးသားဆိုလျှင် parent block များကို skip မည်
            const hasChildIf = scopes.some(
              (s) =>
                s.type === "control-flow" &&
                ["if", "else-if", "else"].includes(s.name),
            );
            if (hasChildIf) {
              currentNode = currentNode.parent;
              continue;
            }

            // 💡 True Lezer AST Structural Evaluation:
            // လက်ရှိ IfStatement သည် မိခင် IfStatement ၏ 'else' branch နေရာတွင် ဝင်နေသော
            // ညှပ်ပူးညှပ်ပိတ် node ဖြစ်ပါက ၎င်းသည် တကယ့် "else-if" ဖြစ်သည်။
            const parentNode = currentNode.parent;
            const isInsideParentElseBranch =
              parentNode &&
              parentNode.name === "IfStatement" &&
              currentNode.from >
                (parentNode.getChild("else")?.from ?? Infinity);

            if (isInsideParentElseBranch) {
              nodeName = "else-if";
            } else {
              // မိခင်ရဲ့ else branch ထဲက ထပ်ဆင့် if မဟုတ်တော့ဘူးဆိုလျှင်...
              // လက်ရှိ node ကိုယ်တိုင်ရဲ့ else keyword ရဲ့ နောက်ဘက်တွင် cursor ရောက်နေပါက တကယ့် "else" သက်သက်ဖြစ်သည်။
              const elseKeywordNode = currentNode.getChild("else");

              if (elseKeywordNode && cursorPos >= elseKeywordNode.from) {
                // ၎င်း else keyword ၏ နောက်ကပ်လျက်တွင် IfStatement တိုက်ရိုက်မရှိတော့လျှင် တကယ့် "else" အစစ်ဖြစ်သည်။
                const hasNextIf = currentNode.getChild("IfStatement");
                nodeName = hasNextIf ? "else-if" : "else";
              } else {
                nodeName = "if";
              }
            }
          } else {
            nodeName = nodeType
              .replace("Statement", "")
              .replace("Clause", "")
              .toLowerCase();
            if (nodeName === "catchclause") nodeName = "catch";
          }
        } else if (mappedType === "array" || mappedType === "object") {
          const lookbackStart = Math.max(0, currentNode.from - 100);
          const preamble = code.slice(lookbackStart, currentNode.from);

          const varMatch = preamble.match(
            /(?:const|let|var|this\.)\s*([a-zA-Z0-9_$]+)(?:\s*:\s*[^=]+)?\s*=\s*$/,
          );
          const propMatch = preamble.match(/([a-zA-Z0-9_$]+)\s*:\s*$/);

          if (varMatch && varMatch[1]) {
            nodeName = varMatch[1];
          } else if (propMatch && propMatch[1]) {
            nodeName = propMatch[1];
          } else {
            let parent = currentNode.parent;
            if (
              parent &&
              (parent.name === "VariableDeclarator" ||
                parent.name === "Property")
            ) {
              nodeName = getIdentifierName(parent, code);
            }
          }

          if (!nodeName) {
            currentNode = currentNode.parent;
            continue;
          }
        } else if (mappedType === "arrow") {
          // 💡 Fix 2 & 3: AST Controlled Scope Extractor (Regex အလုံးစုံ ဖယ်ရှားပြီးသား)
          let callParent: SyntaxNode | null = currentNode.parent;

          while (
            callParent &&
            callParent.name !== "Block" &&
            callParent.name !== "FunctionDeclaration"
          ) {
            if (callParent.name === "CallExpression") {
              const callee = callParent.getChild("MemberExpression");
              if (callee) {
                const propNode = callee.getChild("PropertyName");
                if (propNode) {
                  const methodName = code
                    .slice(propNode.from, propNode.to)
                    .trim();

                  // Target Method စာရင်းများ
                  const isArrayMethod = [
                    "filter",
                    "map",
                    "forEach",
                    "reduce",
                    "find",
                    "some",
                    "every",
                  ].includes(methodName);
                  const isListener = [
                    "addEventListener",
                    "removeEventListener",
                  ].includes(methodName);

                  if (isArrayMethod || isListener) {
                    typeOverride = isListener ? "listener" : "arrow";

                    // AST Dynamic Root Identifier ဆွဲထုတ်ခြင်း
                    const rootCaller = findRootCallerName(callee, code);
                    nodeName =
                      rootCaller && rootCaller !== "return"
                        ? `${rootCaller}.${methodName}`
                        : methodName;
                    break;
                  }
                }
              }
            }
            callParent = callParent.parent;
          }

          // Fallback variable assign bindings (အကယ်၍ ရိုးရိုး function assigning ဖြစ်လျှင်)
          if (!nodeName) {
            const lookbackStart = Math.max(0, currentNode.from - 60);
            const preamble = code.slice(lookbackStart, currentNode.from);
            const varMatch = preamble.match(
              /(?:const|let|var|this\.)\s*([a-zA-Z0-9_$]+)\s*=\s*$/,
            );
            const propMatch = preamble.match(/([a-zA-Z0-9_$]+)\s*:\s*$/);

            if (varMatch && varMatch[1]) {
              nodeName = varMatch[1];
              typeOverride = "function";
            } else if (propMatch && propMatch[1]) {
              nodeName = propMatch[1];
              typeOverride = "function";
            }
          }

          if (!nodeName) {
            currentNode = currentNode.parent;
            continue;
          }
        }

        if (nodeName) {
          const isDuplicate = scopes.some((s) => s.name === nodeName);
          if (!isDuplicate) {
            scopes.unshift({ name: nodeName, type: typeOverride });
          }
        }
      }

      currentNode = currentNode.parent;
    }
  } catch (err) {
    console.error("Breadcrumbs parse error:", err);
  }

  return scopes;
}

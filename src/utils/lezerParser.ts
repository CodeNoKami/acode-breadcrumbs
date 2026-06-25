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
    tagNode.getChild("JSXIdentifier") || tagNode.getChild("JSXBuiltin");
  if (identifier) return code.slice(identifier.from, identifier.to).trim();
  return "JSX";
}

function getPureMethodName(node: SyntaxNode, code: string): string | null {
  const callee = node.firstChild;
  if (!callee) return null;

  if (callee.name === "MemberExpression") {
    const propNode = callee.getChild("PropertyName");
    if (propNode) {
      return code.slice(propNode.from, propNode.to).trim();
    }
  }
  return code.slice(callee.from, callee.to).trim();
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
        } else if (mappedType === "static-block") {
          nodeName = "static {}";
        } else if (mappedType === "jsx") {
          nodeName = getJSXTagName(currentNode, code);
        } else if (mappedType === "control-flow") {
          nodeName = nodeType
            .replace("Statement", "")
            .replace("Clause", "")
            .toLowerCase();
          if (nodeName === "catchclause") nodeName = "catch";
        }
        // 🔧 Ultimate Hybrid Lookback Engine for BOTH Arrays & Objects
        else if (mappedType === "array" || mappedType === "object") {
          // Bracket ([ သို့မဟုတ် {) ပွင့်ခဲ့သည့် နေရာအရှေ့မှ ကုဒ်စာလုံး ၁၀၀ ကို လှမ်းဖတ်သည်
          const lookbackStart = Math.max(0, currentNode.from - 100);
          const preamble = code.slice(lookbackStart, currentNode.from);

          // Pattern 1: Variable assignments (e.g., const config: MyType = { ... })
          // TypeScript specifications ပါလာလျှင်ပါ ကျော်ဖြတ်နိုင်ရန် Regex ကို Multi-line flag အနည်းငယ်ညှိထားသည်
          const varMatch = preamble.match(
            /(?:const|let|var|this\.)\s*([a-zA-Z0-9_$]+)(?:\s*:\s*[^=]+)?\s*=\s*$/,
          );

          // Pattern 2: Nested Object keys သို့မဟုတ် Destructured keys (e.g., userList: [ ... ])
          const propMatch = preamble.match(/([a-zA-Z0-9_$]+)\s*:\s*$/);

          if (varMatch && varMatch[1]) {
            nodeName = varMatch[1];
          } else if (propMatch && propMatch[1]) {
            nodeName = propMatch[1];
          } else {
            // Fallback: အကယ်၍ standalone inline structure သက်သက်ဖြစ်ပါက AST တိုင်း ရှာမည်
            let parent = currentNode.parent;
            if (
              parent &&
              (parent.name === "VariableDeclarator" ||
                parent.name === "Property")
            ) {
              nodeName = getIdentifierName(parent, code);
            }
          }

          // အမည်တပ်မထားသော သာမန် standalone array/object (ဥပမာ parameter ထဲက ကောင်လေးတွေ) ဖြစ်ပါက ကျော်မည်
          if (!nodeName) {
            currentNode = currentNode.parent;
            continue;
          }
        } else if (mappedType === "arrow") {
          const lookbackStart = Math.max(0, currentNode.from - 80);
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
          } else {
            let parent = currentNode.parent;
            while (parent) {
              if (parent.name === "CallExpression") {
                const pureName = getPureMethodName(parent, code);
                if (pureName) {
                  nodeName = pureName;
                  typeOverride = "function";
                }
                break;
              }
              parent = parent.parent;
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

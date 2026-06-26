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
    case "SwitchStatement":
    case "IfStatement":
    case "TryStatement":
    case "CatchClause":
    case "FinallyClause":
      return "control-flow";
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
    case "VariableDeclaration":
    case "VariableDeclarator":
      return "variable";
    default:
      return null;
  }
}

function getIdentifierName(node: SyntaxNode, code: string): string | null {
  if (!node) return null;

  // 🎯 FIX: Constructor Method ဖြစ်ပါက "constructor" ဟု တိုက်ရိုက်ပြန်ပေးရန်
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
    "PropertyName",
    "JSXIdentifier",
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

function getJSXTagName(node: SyntaxNode, code: string): string | null {
  const tagNode =
    node.getChild("JSXOpenTag") || node.getChild("JSXSelfClosingTag");
  if (!tagNode) return null;
  const identifier = tagNode.getChild("JSXIdentifier");
  if (identifier) return code.slice(identifier.from, identifier.to).trim();
  return "JSX";
}

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

function getLookbackName(
  nodeFrom: number,
  code: string,
): { name: string; type: string } | null {
  const lookbackStart = Math.max(0, nodeFrom - 120);
  const preamble = code.slice(lookbackStart, nodeFrom);

  const varMatch = preamble.match(
    /(?:const|let|var|this\.)\s*([a-zA-Z0-9_$]+)(?:\s*:\s*[^=]+)?\s*=\s*$/,
  );
  if (varMatch && varMatch[1]) {
    return { name: varMatch[1], type: "variable" };
  }

  const propMatch = preamble.match(/([a-zA-Z0-9_$]+)\s*:\s*$/);
  if (propMatch && propMatch[1]) {
    return { name: propMatch[1], type: "property" };
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
    let caughtClause = false;
    let hasCapturedMethodChain = false; // 🎯 FIX: Chaining အထပ်ထပ် ဖြစ်နေပါက အနီးစပ်ဆုံး တစ်ခုသာ ယူရန် Guard

    const processedNodes = new Set<number>();

    while (currentNode) {
      const nodeType = currentNode.name;
      const mappedType = getScopeType(nodeType);

      if (processedNodes.has(currentNode.from)) {
        currentNode = currentNode.parent;
        continue;
      }

      // ======================================================================
      // ၁။ TRY / CATCH / FINALLY LOGIC
      // ======================================================================
      if (nodeType === "FinallyClause") {
        caughtClause = true;
        scopes.unshift({ name: "finally", type: "control-flow" });
      } else if (nodeType === "CatchClause") {
        caughtClause = true;
        scopes.unshift({ name: "catch", type: "control-flow" });
      } else if (nodeType === "TryStatement") {
        if (!caughtClause) {
          scopes.unshift({ name: "try", type: "control-flow" });
        }
        caughtClause = false;
      }

      // ======================================================================
      // ၂။ CALL EXPRESSIONS & MULTI-LEVEL CHAINING
      // ======================================================================
      else if (nodeType === "CallExpression") {
        const memberExpr = currentNode.getChild("MemberExpression");
        if (memberExpr) {
          const propNode = memberExpr.getChild("PropertyName");
          if (propNode) {
            const methodName = code.slice(propNode.from, propNode.to).trim();

            if (methodName === "addEventListener") {
              const leftNode = memberExpr.firstChild;
              const callerName = leftNode
                ? findRootCallerName(leftNode, code)
                : "window";
              scopes.unshift({
                name: callerName
                  ? `${callerName}.addEventListener`
                  : "addEventListener",
                type: "listener",
              });
            } else if (
              ["filter", "map", "reduce", "forEach"].includes(methodName)
            ) {
              // 🎯 FIX: အကယ်၍ Chain ထဲက အနီးစပ်ဆုံး Method ကို ယူပြီးသားဆိုလျှင် အပြင်ဘက် Chain များကို ကျော်မည်
              if (!hasCapturedMethodChain) {
                const leftNode = memberExpr.firstChild;
                const rootCaller = leftNode
                  ? findRootCallerName(leftNode, code)
                  : null;
                const displayName =
                  rootCaller && rootCaller !== "return"
                    ? `${rootCaller}.${methodName}`
                    : `.${methodName}`;

                scopes.unshift({ name: displayName, type: "method-chain" });
                hasCapturedMethodChain = true; // Chain တစ်ခု မိသွားပြီဖြစ်၍ အပေါ်ထပ်များကို ပိတ်လိုက်သည်
              }
            }
          }
        }
      }

      // ======================================================================
      // ၃။ EXPRESSIONS UP-LINK MATCHING (HYBRID AST + LOOKBACK)
      // ======================================================================
      else if (
        [
          "ObjectExpression",
          "ArrayExpression",
          "ArrowFunction",
          "FunctionExpression",
        ].includes(nodeType)
      ) {
        let nameFound = false;
        let parent = currentNode.parent;

        if (parent && parent.name === "VariableDeclaration") {
          parent = parent.getChild("VariableDeclarator") || parent;
        }

        if (
          parent &&
          (parent.name === "VariableDeclarator" ||
            parent.name === "Property" ||
            parent.name === "PropertyDeclaration")
        ) {
          const nodeName = getIdentifierName(parent, code);
          if (nodeName) {
            let typeOverride = mappedType!;
            if (nodeType === "ObjectExpression") typeOverride = "object";
            else if (nodeType === "ArrayExpression") typeOverride = "array";
            else if (nodeType === "ArrowFunction") typeOverride = "arrow";
            else if (nodeType === "FunctionExpression")
              typeOverride = "function";

            scopes.unshift({ name: nodeName, type: typeOverride });
            processedNodes.add(parent.from);
            processedNodes.add(currentNode.parent?.from || 0);
            nameFound = true;
          }
        }

        if (!nameFound) {
          const fallback = getLookbackName(currentNode.from, code);
          if (fallback) {
            let typeOverride = fallback.type;
            if (nodeType === "ObjectExpression") typeOverride = "object";
            else if (nodeType === "ArrayExpression") typeOverride = "array";
            else if (nodeType === "ArrowFunction") typeOverride = "arrow";
            else if (nodeType === "FunctionExpression")
              typeOverride = "function";

            scopes.unshift({ name: fallback.name, type: typeOverride });
            nameFound = true;
          }
        }
      }

      // ======================================================================
      // ၄။ NATIVE DECLARATIONS, FIELDS AND CONTROL FLOWS
      // ======================================================================
      else if (mappedType) {
        let nodeName: string | null = null;

        if (
          ["class", "interface", "type", "enum", "function", "method"].includes(
            mappedType,
          )
        ) {
          nodeName = getIdentifierName(currentNode, code);
        } else if (
          nodeType === "VariableDeclaration" ||
          nodeType === "VariableDeclarator"
        ) {
          const targetNode =
            nodeType === "VariableDeclaration"
              ? currentNode.getChild("VariableDeclarator")
              : currentNode;
          if (targetNode) {
            nodeName = getIdentifierName(targetNode, code);
            if (nodeName) {
              const childExpr =
                targetNode.getChild("ObjectExpression") ||
                targetNode.getChild("ArrowFunction") ||
                targetNode.getChild("FunctionExpression") ||
                targetNode.getChild("ArrayExpression");
              if (childExpr) {
                currentNode = currentNode.parent;
                continue;
              }
              scopes.unshift({ name: nodeName, type: "variable" });
              processedNodes.add(currentNode.from);
            }
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
          nodeName = getJSXTagName(currentNode, code);
        } else if (
          mappedType === "control-flow" &&
          nodeType !== "TryStatement"
        ) {
          if (nodeType === "IfStatement") {
            const hasChildIf = scopes.some(
              (s) =>
                s.type === "control-flow" &&
                ["if", "else-if", "else"].includes(s.name),
            );
            if (hasChildIf) {
              currentNode = currentNode.parent;
              continue;
            }

            const parentNode = currentNode.parent;
            const isInsideParentElseBranch =
              parentNode &&
              parentNode.name === "IfStatement" &&
              currentNode.from >
                (parentNode.getChild("else")?.from ?? Infinity);

            if (isInsideParentElseBranch) {
              nodeName = "else-if";
            } else {
              const elseKeywordNode = currentNode.getChild("else");
              if (elseKeywordNode && cursorPos >= elseKeywordNode.from) {
                nodeName = currentNode.getChild("IfStatement")
                  ? "else-if"
                  : "else";
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
        }

        if (
          nodeName &&
          ![
            "Property",
            "PropertyDeclaration",
            "VariableDeclaration",
            "VariableDeclarator",
          ].includes(nodeType)
        ) {
          scopes.unshift({ name: nodeName, type: mappedType });
        }
      }

      currentNode = currentNode.parent;
    }
  } catch (err) {
    console.error("Breadcrumbs Hybrid Master Engine Error:", err);
  }

  return scopes.filter(
    (v, i, a) =>
      a.findIndex((t) => t.name === v.name && t.type === v.type) === i,
  );
}

// ============================================================================
// 🎬 ACODE BREADCRUMBS - STANDALONE LIVE CODE BLOCK DECODER (DEBUG WRAPPER)
// ============================================================================
export function debugCursorAST(code: string, cursorPos: number): void {
  try {
    const tree = parser.parse(code);
    let tracerNode: SyntaxNode | null = tree.resolveInner(cursorPos, -1);

    if (!tracerNode) {
      console.log("⚠️ No AST Node found at the current cursor position.");
      return;
    }

    const tableData = [];
    let level = 0;

    while (tracerNode) {
      // ၁။ လက်ရှိ Node ရဲ့ စာသားအပြည့်အစုံကို Slice ဖြတ်ယူခြင်း
      const rawCodeBlock = code.slice(tracerNode.from, tracerNode.to).trim();

      // ၂။ Console မှာ မျက်စိမရှုပ်အောင် စာသားအရှည်ကြီးဖြစ်နေရင် ချုံ့ပစ်ခြင်း
      let cleanCodeSnippet = rawCodeBlock.replace(/\s+/g, " ");
      if (cleanCodeSnippet.length > 55) {
        cleanCodeSnippet =
          cleanCodeSnippet.slice(0, 50) + " ... " + cleanCodeSnippet.slice(-10);
      }

      // ၃။ Table Row အဖြစ် Data စုဆောင်းခြင်း
      tableData.push({
        "Layer (RTL)": `[${level++}]`,
        "AST Node Name": tracerNode.name,
        "Range (From-To)": `${tracerNode.from} - ${tracerNode.to}`,
        "Real Code Block": cleanCodeSnippet,
      });

      // ၄။ အပြင်ဘက် Parent ဧရိယာသို့ တစ်ဆင့်ချင်း ဆက်တက်သွားခြင်း
      tracerNode = tracerNode.parent;
    }

    // 🎯 Visual Output: Table အား Console တွင် တိုက်ရိုက် ရိုက်ထုတ်ပြသခြင်း
    console.log(
      `\n🎯 --- BREADCRUMBS CURSOR POSITION DECODE [Pos: ${cursorPos}] ---`,
    );
    console.table(tableData);
    console.log(
      "-------------------------------------------------------------\n",
    );
  } catch (debugError) {
    console.error("❌ Debug Block Decoder Error:", debugError);
  }
}
// ============================================================================

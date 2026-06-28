import { parser as jsParser } from "@lezer/javascript";
import { SyntaxNode } from "@lezer/common";

// Configure Lezer Parser to support full TypeScript type definitions and React JSX/TSX syntax trees
const parser = jsParser.configure({ dialect: "ts jsx" });

/**
 * Interface representing a verified structural scope point in the breadcrumbs hierarchy
 */
export interface ScopeBlock {
  name: string;
  type: string;
  from: number; // Text offset position within the document buffer for interactive code navigation
}

/**
 * Maps a raw CodeMirror Lezer AST Node type string into standard plugin layout semantic scopes
 * @param nodeType - The structural name token from the parser tree
 * @returns Standardized tracking string or null if the node should be skipped
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

/**
 * Traverses immediate adjacent sibling child elements to safely locate binding identifier literals
 * @param node - Target structural node to evaluate
 * @param code - Active raw string text buffer
 * @returns Extracted string identifier name or null if unmapped
 */
function getIdentifierName(
  node: SyntaxNode | null,
  code: string,
): string | null {
  if (!node) return null;

  // Explicit override rule: Force target structural methods matching 'constructor' names directly
  if (
    node.name === "MethodDeclaration" &&
    code.slice(node.from, node.to).trim().startsWith("constructor")
  ) {
    return "constructor";
  }

  // Predefined acceptable Lezer syntax tokens representing actual descriptive object labels
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

/**
 * Extracts parameter naming signatures from function parameter definitions
 */
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

/**
 * Recursively resolves complex multi-tier dot notations or execution patterns back into clean definitions
 * @example turns 'this.database.usersList.filter' into a clear readable string expression
 */
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

/**
 * Parses JSX opening context fragments and isolates sub-attribute scopes during inline parameter interactions
 */
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

  // Fallback scanner tracing raw boundaries if primary identifier elements return empty mappings
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

  // Smart Context Tracking: If cursor is localized within specific attribute tokens, append them (e.g., Component.onClick)
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

/**
 * Secondary lookback text slicer running regex matches on text preambles for syntax exceptions
 */
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

/**
 * Main parser entry point executing bottom-up AST traversal from active cursor offsets
 * @param code - Full continuous text context inside working document buffer
 * @param cursorPos - Target anchor integer tracking current hardware caret focus offset
 * @returns Array list containing fully mapped out layout tracks
 */
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
    const processedNodes = new Set<number>(); // De-duplication set to protect against infinite tracking recursion loops

    while (currentNode) {
      const nodeType = currentNode.name;
      const mappedType = getScopeType(nodeType);

      // Fast-pass loop skipping to parent nodes if current offset coordinates were checked previously
      if (processedNodes.has(currentNode.from)) {
        currentNode = currentNode.parent;
        continue;
      }

      // Block Tier 1: Process and catch explicit Exception Handling blocks
      if (nodeType === "FinallyClause") {
        caughtClause = true;
        scopes.unshift({
          name: "finally",
          type: "try-catch-finally",
          from: currentNode.from,
        });
      } else if (nodeType === "CatchClause") {
        caughtClause = true;
        scopes.unshift({
          name: "catch",
          type: "try-catch-finally",
          from: currentNode.from,
        });
      } else if (nodeType === "TryStatement") {
        if (!caughtClause)
          scopes.unshift({
            name: "try",
            type: "try-catch-finally",
            from: currentNode.from,
          });
        caughtClause = false; // Reset catch monitoring states
      }
      // Block Tier 2: Process Method Pipelines and Function calls (.map, .filter, event listeners)
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
                name: callerName
                  ? `${callerName}.addEventListener`
                  : "addEventListener",
                type: "listener",
                from: currentNode.from,
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
              // Ensure we isolate only the immediate method operation chain in multi-chain sequences
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
                  name: displayName,
                  type: "method-chain",
                  from: currentNode.from,
                });
                hasCapturedMethodChain = true;
              }
            }
          }
        } else {
          // Track and represent global class initializers and constructor object setups
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
                name: `${calleeName}()`,
                type: "function",
                from: currentNode.from,
              });
            }
          }
        }
      }
      // Block Tier 3: Process Structural Anonymous Data Sets (Callbacks, Arrays, Literals)
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
        if (parent && parent.name === "VariableDeclaration")
          parent = parent.getChild("VariableDeclarator") || parent;

        // Resolve named structural bindings (e.g., 'const user = () => {}')
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
            scopes.unshift({
              name: nodeName,
              type: typeOverride,
              from: currentNode.from,
            });
            processedNodes.add(parent.from);
            processedNodes.add(
              currentNode.parent ? currentNode.parent.from : 0,
            );
          }
        }

        if (!nodeName && nodeType === "FunctionExpression") {
          nodeName = getIdentifierName(currentNode, code);
          if (nodeName)
            scopes.unshift({
              name: nodeName,
              type: typeOverride,
              from: currentNode.from,
            });
        }

        // Apply fallback handlers if structural properties are wrapped without formal assignments
        if (!nodeName) {
          const fallback = getLookbackName(currentNode.from, code);
          if (fallback) {
            scopes.unshift({
              name: fallback.name,
              type: typeOverride,
              from: currentNode.from,
            });
          } else if (
            nodeType === "ArrowFunction" ||
            nodeType === "FunctionExpression"
          ) {
            let isStandardCallback = false;
            let parentNode = currentNode.parent;

            // Smart event filter logic: Prevent rendering inline arrow parameters inside JSX or core method pipelines
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

            // Fallback to parameter name or use clean "anonymous" token identifier string
            if (!isStandardCallback) {
              const paramName = getParamName(currentNode, code);
              const defaultName = paramName ? paramName : "anonymous";
              scopes.unshift({
                name: defaultName,
                type: typeOverride,
                from: currentNode.from,
              });
            }
          }
        }
      }
      // Block Tier 4: Process Standard Mapped Control Flow, Declarations, and Declarators
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
              continue; // Delegate tracking loop back to expressions handling blocks directly
            }
            scopes.unshift({
              name: nodeName,
              type: "variable",
              from: currentNode.from,
            });
          }
        } else if (
          nodeType === "Property" ||
          nodeType === "PropertyDeclaration"
        ) {
          nodeName = getIdentifierName(currentNode, code);
          if (nodeName) {
            let finalType = "property";
            if (currentNode.getChild("Block")) finalType = "method";
            scopes.unshift({
              name: nodeName,
              type: finalType,
              from: currentNode.from,
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
          // Safe evaluation logic to process alternative continuous 'else-if' structural combinations
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
          scopes.unshift({
            name: nodeName,
            type: mappedType,
            from: currentNode.from,
          });
        }
      }
      currentNode = currentNode.parent; // Traverse upward to outer structural tracking scope blocks
    }
  } catch (err) {
    console.error("Breadcrumbs Error:", err);
  }

  return scopes;
}

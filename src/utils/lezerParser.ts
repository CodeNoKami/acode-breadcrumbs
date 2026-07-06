import { SyntaxNode, Tree } from "@lezer/common";

/**
 * Represents a parsed structural blueprint context segment inside the source document.
 * Maps directly to individual breadcrumb segments rendered in the premium UI bar.
 */
export interface ScopeBlock {
  /** Unique identifying token pattern generated from the start offset and token type */
  id: string;
  /** The clean semantic display name of the code block segment */
  name: string;
  /** Syntactic category classification (e.g., 'class', 'function', 'conditional', 'listener') */
  type: string;
  /** Absolute source character string start position pointer offset index */
  from: number;
  /** Absolute source character string ending position pointer offset index */
  to: number;
  /** The human-readable source code line index position computed via binary search */
  line: number;
}

/**
 * Maps Lezer Abstract Syntax Tree (AST) core nodes directly to the Breadcrumbs Premium Neon Scopes.
 * Isolates and extracts language-agnostic structural blocks from JS/TS documents.
 *
 * @param nodeType - Raw classification string identifier returned directly from Lezer parser tree nodes.
 * @returns A matching normalized code block scope name token string, or null if the block is ignored.
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

/**
 * Collection array of direct identifier syntax node name rules containing literal display strings.
 */
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

/**
 * Collection array of common standard listener registration hooks and reactive stream hook naming conventions.
 */
const listenerHooks = [
  "addEventListener",
  "removeEventListener",
  "on",
  "off",
  "once",
  "subscribe",
  "watch",
];

/**
 * Recursively inspects a node structure branch to find and extract its variable or reference name identifier string.
 * Automatically accommodates constructor overrides in standard class-method declarations.
 *
 * @param node - The starting syntax container node element tree branch.
 * @param code - The raw active source string used to execute character slices.
 * @returns The resolved literal string contents representing the node name identifier, or null.
 */
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

/**
 * Detects a leading `get`/`set` keyword immediately before the identifier
 * token inside a MethodDeclaration or Property node, and returns the
 * prefixed name (e.g. "(get) foo"). Shared by both the class-method path
 * and the object-literal-property path so the logic only lives in one place.
 *
 * @param containerNode - The parent property or method node element declaration to inspect.
 * @param code - The raw active source string used to execute character slices.
 * @param baseName - The base identifier name resolved for the target method or property.
 * @returns The modifier-prefixed label string or the fallback base name unchanged.
 */
function withAccessorPrefix(
  containerNode: SyntaxNode,
  code: string,
  baseName: string,
): string {
  let child = containerNode.firstChild;
  while (child) {
    if (directNameTokens.includes(child.name)) {
      const prefixText = code.slice(containerNode.from, child.from);
      if (/\bget\b/.test(prefixText)) return `(get) ${baseName}`;
      if (/\bset\b/.test(prefixText)) return `(set) ${baseName}`;
      break;
    }
    // Object-literal shorthand getters/setters expose bare `get`/`set`
    // tokens as siblings rather than keywords baked into the prefix text.
    if (child.name === "get" || child.name === "set") {
      return `(${child.name}) ${baseName}`;
    }
    child = child.nextSibling;
  }
  return baseName;
}

/**
 * Traverses a CallExpression or MemberExpression tree path backwards to formulate
 * a flattened string descriptor representation of the nested object reference.
 *
 * @param node - The starting identifier or member chain branch node element.
 * @param code - The raw active source string used to execute character slices.
 * @returns A dot-notated representation of the access path chain string, or null.
 */
function getCleanCallerName(
  node: SyntaxNode | null,
  code: string,
): string | null {
  if (!node) return null;
  const nodeName = node.name;

  if (
    nodeName === "VariableName" ||
    nodeName === "Identifier" ||
    nodeName === "this" ||
    nodeName === "PrivatePropertyName" ||
    nodeName === "PrivateIdentifier"
  ) {
    return code.slice(node.from, node.to).trim();
  }
  if (nodeName === "MemberExpression") {
    const left = node.firstChild;
    const right =
      node.getChild("PropertyName") ||
      node.getChild("PrivatePropertyName") ||
      node.getChild("Identifier");
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

/**
 * Extracts the explicit element tag name from a JSX element and calculates contextual meta
 * properties if the cursor rests within a specific attribute assignment block wrapper.
 *
 * @param node - The underlying parent JSX opening or self-closing container syntax node.
 * @param code - The raw active source string used to execute character slices.
 * @param cursorPos - Absolute cursor offset coordinate position inside the current text document.
 * @returns An object payload detailing the tag name string, matching attribute node bounds, and attribute name string.
 */
function getJSXTagName(
  node: SyntaxNode,
  code: string,
  cursorPos: number,
): { name: string; attrScope: SyntaxNode | null; attrName: string | null } {
  const tagNode =
    node.getChild("JSXOpenTag") || node.getChild("JSXSelfClosingTag");
  if (!tagNode) return { name: "JSX", attrScope: null, attrName: null };

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

  // Find the attribute the cursor currently sits in, if any, so callers can
  // tell whether we're inside e.g. `onClick={...}` and build a richer label.
  let attrChild = tagNode.firstChild;
  while (attrChild) {
    if (
      attrChild.name === "JSXAttribute" &&
      cursorPos >= attrChild.from &&
      cursorPos <= attrChild.to
    ) {
      const attrNameNode = attrChild.getChild("JSXIdentifier");
      if (attrNameNode) {
        return {
          name: tagName,
          attrScope: attrChild,
          attrName: code.slice(attrNameNode.from, attrNameNode.to).trim(),
        };
      }
    }
    attrChild = attrChild.nextSibling;
  }

  return { name: tagName, attrScope: null, attrName: null };
}

/**
 * String parsing scan heuristic method that sweeps backwards from a node start offset boundary
 * to extract implicit naming tokens for anonymous function expressions or inline structures.
 *
 * @param nodeFrom - Starting character string offset index of the anonymous structural node element.
 * @param code - The raw active source string used to execute character slices.
 * @returns A structured lookup signature detailing the matching variable name and type, or null.
 */
function getLookbackName(
  nodeFrom: number,
  code: string,
): { name: string; type: string } | null {
  let idx = nodeFrom - 1;
  let hasValidTrigger = false;
  let triggerChar = "";
  while (idx >= 0 && idx >= nodeFrom - 120) {
    const char = code[idx];
    if (char === "=" || char === ":") {
      // Guard against `==`, `===`, `!=` style comparisons being mistaken
      // for an assignment trigger.
      if (char === "=" && (code[idx - 1] === "=" || code[idx - 1] === "!")) {
        idx--;
        continue;
      }
      // Guard against a ternary's `:` branch separator being mistaken for
      // an object-literal property colon.
      if (char === ":") {
        const beforeTernary = code.slice(Math.max(0, idx - 40), idx);
        if (/\?[^:{}]*$/.test(beforeTernary)) {
          idx--;
          continue;
        }
      }
      hasValidTrigger = true;
      triggerChar = char;
      break;
    }
    idx--;
  }
  if (!hasValidTrigger) return null;

  const lookbackStart = Math.max(0, nodeFrom - 120);
  const preamble = code.slice(lookbackStart, nodeFrom);

  if (triggerChar === "=") {
    const varMatch = preamble.match(
      /(?:const|let|var|this\.)\s*([a-zA-Z0-9_$]+)(?:\s*:\s*[^=]+)?\s*=\s*$/,
    );
    if (varMatch && varMatch[1]) return { name: varMatch[1], type: "variable" };
  }
  const propMatch = preamble.match(/([a-zA-Z0-9_$]+)\s*:\s*$/);
  if (propMatch && propMatch[1])
    return { name: propMatch[1], type: "property" };
  return null;
}

/**
 * Traverses and evaluates the active Lezer Abstract Syntax Tree (AST) structure relative
 * to the absolute cursor position, generating an ordered sequence array of scope block footprints.
 * Calculates explicit contextual structural scopes including event listeners, method chains,
 * component trees, and loop conditionals.
 *
 * @param tree - Complete syntax parsing architecture tree output returned by Lezer for analysis.
 * @param code - Complete raw string text body contained inside the target editing canvas.
 * @param cursorPos - The specific character coordinate index identifying where the user cursor lives.
 * @returns Flattened array map sequence of structural scope elements matching the hierarchical stack tree.
 */
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
      // Guard each iteration individually so one malformed node can't wipe
      // out breadcrumbs already resolved further down the tree.
      try {
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
                      .replace(/^['"`]|['"`]$/g, "");
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

          // Walk up to see whether this closure lives inside a JSX
          // attribute (e.g. onClick={() => {...}}). Rather than silently
          // dropping the scope (previous behavior), surface it as
          // "<Tag>.eventName cb" when it's a function/arrow, and still
          // suppress object/array literals used purely as prop values.
          let jsxAttrHost: SyntaxNode | null = null;
          let jsxElementHost: SyntaxNode | null = null;
          let checkJSX = currentNode.parent;
          while (checkJSX) {
            if (checkJSX.name === "JSXAttribute") {
              jsxAttrHost = checkJSX;
            }
            if (
              checkJSX.name === "JSXElement" ||
              checkJSX.name === "JSXSelfClosingTag"
            ) {
              jsxElementHost = checkJSX;
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

          if (jsxAttrHost) {
            const isCallable =
              nodeType === "ArrowFunction" || nodeType === "FunctionExpression";
            if (!isCallable) {
              // Object/array literal used as a plain prop value (e.g.
              // style={{...}}) — not meaningful as a breadcrumb, skip it.
              currentNode = currentNode.parent;
              continue;
            }
            const attrNameNode = jsxAttrHost.getChild("JSXIdentifier");
            const attrName = attrNameNode
              ? code.slice(attrNameNode.from, attrNameNode.to).trim()
              : null;
            const { name: tagName } = jsxElementHost
              ? getJSXTagName(jsxElementHost, code, cursorPos)
              : { name: "JSX" };

            if (attrName) {
              scopes.unshift({
                id: `jsx-handler-${currentNode.from}`,
                name: `${tagName}.${attrName} cb`,
                type: "function",
                from: currentNode.from,
                to: currentNode.to,
                line: 0,
              });
              processedNodes.add(nodeKey);
              currentNode = currentNode.parent;
              continue;
            }
            // Couldn't resolve an attribute name; fall through to default
            // anonymous-function handling below rather than dropping it.
          }

          const parent = currentNode.parent;

          // --- ADVANCED METHOD CHAIN RECURSIVE ANCHOR SEARCH ---
          if (parent && parent.name === "ArgList") {
            let topAnchor: SyntaxNode | null = parent.parent; // Current CallExpression
            let firstCallee: SyntaxNode | null = null;

            // Climb up through the entire fluent chain layers to find the
            // top-most CallExpression.
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

            // Descend back down to find the root object the chain started from.
            if (topAnchor && topAnchor.name === "CallExpression") {
              let baseNode: SyntaxNode | null = topAnchor;
              while (baseNode && baseNode.name === "CallExpression") {
                const callee: any = baseNode.firstChild;
                if (callee && callee.name === "MemberExpression") {
                  baseNode = callee.firstChild;
                } else {
                  baseNode = callee;
                  break;
                }
              }
              firstCallee = baseNode;
            }

            if (topAnchor) {
              let rootName = firstCallee
                ? getCleanCallerName(firstCallee, code)
                : null;

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
          // --- END METHOD CHAIN JUMPER ---

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
            [
              "class",
              "interface",
              "type",
              "enum",
              "function",
              "method",
            ].includes(mappedType)
          ) {
            nodeName = getIdentifierName(currentNode, code);

            if (nodeName && nodeType === "MethodDeclaration") {
              nodeName = withAccessorPrefix(currentNode, code, nodeName);
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
              nodeName = withAccessorPrefix(currentNode, code, nodeName);

              const finalType = currentNode.getChild("Block")
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

              // Blacklist both this node and its parent ObjectExpression so
              // the loop doesn't re-process/duplicate this scope on the way up.
              processedNodes.add(nodeKey);
              if (currentNode.parent) {
                processedNodes.add(
                  `${currentNode.parent.from}-${currentNode.parent.name}`,
                );
              }
            }
          } else if (mappedType === "jsx") {
            const { name, attrName } = getJSXTagName(
              currentNode,
              code,
              cursorPos,
            );
            nodeName = attrName ? `${name}.${attrName}` : name;
            if (nodeName && !/^[A-Z]/.test(nodeName.split(".")[0])) {
              nodeName = null; // Filters native lower-cased tags out (e.g. div, section)
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
      } catch (nodeErr) {
        // Don't let one bad node nuke breadcrumbs already resolved deeper
        // in the tree — skip upward and keep going.
        console.error(
          "Acode Breadcrumbs: skipped a node due to error",
          nodeErr,
        );
        currentNode = currentNode ? currentNode.parent : null;
      }
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

  return scopes;
}

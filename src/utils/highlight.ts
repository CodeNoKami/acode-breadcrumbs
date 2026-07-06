import { parser as jsParser } from "@lezer/javascript";
import { highlightCode, classHighlighter } from "@lezer/highlight";
import type { ScopeBlock } from "./lezerParser";

/**
 * Escapes special HTML characters to prevent rendering issues or XSS vulnerabilities.
 *
 * @param str - The raw string to escape.
 * @returns The HTML-safe escaped string.
 */
export function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Highlights a given snippet of JavaScript/TypeScript code using the Lezer parser.
 * Automatically wraps class-context fragments (methods, properties) in a fallback class
 * to ensure syntactically valid parsing without losing original indentation.
 *
 * @param code - The raw source code snippet to highlight.
 * @param filename - The filename used to determine the language dialect (e.g., "index.tsx").
 * @param block - Optional block metadata indicating the current scope context.
 * @returns The syntax-highlighted HTML string containing styled span tags.
 *
 * @example
 * ```typescript
 * const html = highlightCodeSnippet("private name: string;", "model.ts");
 * ```
 */
export function highlightCodeSnippet(
  code: string,
  filename: string,
  block?: ScopeBlock,
): string {
  try {
    let dialect = "";
    const lowerName = filename.toLowerCase();

    // Determine dialect based on file extension
    if (lowerName.endsWith(".tsx")) dialect = "ts jsx";
    else if (lowerName.endsWith(".ts")) dialect = "ts";
    else if (lowerName.endsWith(".jsx")) dialect = "jsx";

    const configuredParser = jsParser.configure({ dialect });
    const trimmed = code.trim();

    // Check if the snippet contains class access modifiers
    const hasModifier =
      /^(private|public|protected|static|async\s+private|async\s+public|async\s+protected)\s/.test(
        trimmed,
      );

    // Optimized RegEx to prevent catastrophic backtracking on large codebases
    const isMethodShorthand = /^[a-zA-Z_]\w*\s*\([^)]*\)\s*\{/.test(trimmed);

    const isClassContext =
      block?.type &&
      (block.type.includes("Method") ||
        block.type.includes("Property") ||
        block.type === "constructor");

    const wrapInClass = hasModifier || isMethodShorthand || isClassContext;

    // Inline markers avoid injecting redundant newlines, preserving original code indentation
    const START_MARKER = "class _FallbackClassWrapper_ {";
    const END_MARKER = "}";

    const targetCode = wrapInClass
      ? `${START_MARKER}${code}${END_MARKER}`
      : code;

    const tree = configuredParser.parse(targetCode);
    let lines: string[] = [""];
    let currentLine = 0;

    const emitToken = (text: string, classes: string) => {
      // Intercept and skip wrapper markers so they don't render in the final HTML output
      if (wrapInClass && (text === START_MARKER || text === END_MARKER)) {
        return;
      }
      const escaped = escapeHtml(text);
      lines[currentLine] += classes
        ? `<span class="${classes}">${escaped}</span>`
        : escaped;
    };

    const emitLineBreak = () => {
      lines.push("");
      currentLine++;
    };

    highlightCode(targetCode, tree, classHighlighter, emitToken, emitLineBreak);

    // Clean up empty tracking artifacts left behind by the wrapped markers
    if (wrapInClass) {
      if (lines[0] === "") lines.shift();
      if (lines[lines.length - 1] === "") lines.pop();
    }

    return lines.join("\n");
  } catch (e) {
    // Fallback safely to raw escaped text if parsing fails completely
    return escapeHtml(code);
  }
}

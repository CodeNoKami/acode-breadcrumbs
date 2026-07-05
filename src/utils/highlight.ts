import { parser as jsParser } from "@lezer/javascript";
import { highlightCode, classHighlighter } from "@lezer/highlight";
import type { ScopeBlock } from "./lezerParser";

export function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function highlightCodeSnippet(
  code: string,
  filename: string,
  block?: ScopeBlock,
): string {
  try {
    let dialect = "";
    const lowerName = filename.toLowerCase();

    if (lowerName.endsWith(".tsx")) dialect = "ts jsx";
    else if (lowerName.endsWith(".ts")) dialect = "ts";
    else if (lowerName.endsWith(".jsx")) dialect = "jsx";

    const configuredParser = jsParser.configure({ dialect });
    const trimmed = code.trim();

    const hasModifier =
      /^(private|public|protected|static|async\s+private|async\s+public|async\s+protected)\s/.test(
        trimmed,
      );
    const isMethodShorthand = /^[a-zA-Z_][a-zA-Z0-9_]*\s*\([^]*?\)\s*\{/.test(
      trimmed,
    );
    const isClassContext =
      block &&
      block.type &&
      (block.type.includes("Method") ||
        block.type.includes("Property") ||
        block.type === "constructor");

    const wrapInClass = hasModifier || isMethodShorthand || isClassContext;
    let targetCode = code;
    if (wrapInClass) {
      targetCode = `class _FallbackClassWrapper_ {\n${code}\n}`;
    }

    const tree = configuredParser.parse(targetCode);
    let lines: string[] = [""];
    let currentLine = 0;

    const emitToken = (text: string, classes: string) => {
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

    if (wrapInClass && lines.length > 2) {
      lines = lines.slice(1, -1);
    }

    return lines.join("\n");
  } catch (e) {
    return escapeHtml(code);
  }
}

export interface PatternRule {
  type: string;
  regex: RegExp;
}

export const SCOPE_PATTERNS: PatternRule[] = [
  { type: "class", regex: /\b(class|interface)\s+([a-zA-Z0-9_$]+)/ },
  {
    type: "function",
    regex:
      /^\s*(?:export\s+(?:default\s+)?)?function\s*\*?\s*([a-zA-Z0-9_$]+)?\s*\([^]*?\)\s*(?::\s*[a-zA-Z0-9_$<>|[\]{}]+)?\s*\{?/,
  },
  {
    type: "arrow",
    regex:
      /\b([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^]*?\)|[a-zA-Z0-9_$]+)\s*=>/,
  },
  {
    type: "callback",
    regex:
      /([a-zA-Z0-9_$]+(?:\.[a-zA-Z0-9_$]+)*)\s*\(\s*(?:\([^]*?\)|[a-zA-Z0-9_$]+)?\s*=>/,
  },

  // Loops & Conditionals
  { type: "for-of", regex: /\bfor\s*\([^]*?\s+of\s+[^)]+\)/ },
  { type: "for-in", regex: /\bfor\s*\([^]*?\s+in\s+[^)]+\)/ },
  { type: "for", regex: /\bfor\s*\([^]*?\)/ },
  { type: "while", regex: /\bwhile\s*\([^]*?\)/ },
  { type: "do-while", regex: /\bdo\b/ },
  { type: "switch", regex: /\bswitch\s*\([^]*?\)/ },
  { type: "if", regex: /\bif\s*\([^]*?\)/ },
  { type: "else", regex: /\belse\b/ },
  { type: "try", regex: /\btry\b/ },
  { type: "catch", regex: /\bcatch\s*\([^]*?\)/ },
  {
    type: "type",
    regex: /\b^\s*(?:export\s+)?type\s+([a-zA-Z0-9_$]+)\s*=\s*\{?/,
  },

  // Methods
  {
    type: "method",

    regex:
      /\b(?!(?:if|for|while|switch|catch|return|await)\b)([a-zA-Z0-9_$]+)\s*\([^]*?\)\s*(?::\s*[a-zA-Z0-9_$<>|[\]{}]+)?\s*\{/,
  },

  // 1. Arrays Assignment
  {
    type: "array",
    regex:
      /\b(?:const|let|var|,)\s+([a-zA-Z0-9_$]+)\s*:\s*[a-zA-Z0-9_$|[\]\s<>]+(?:\s*=\s*\[)/,
  },
  { type: "array", regex: /\b(?:const|let|var|,)\s+([a-zA-Z0-9_$]+)\s*=\s*\[/ },
  { type: "array", regex: /\b(this\.[a-zA-Z0-9_$]+)\s*(?::[^=]+)?\s*=\s*\[/ },
  {
    type: "array",
    regex:
      /\b^\s*(?:const|let|var|export)\s+([a-zA-Z0-9_$]+)\s*(?::\s*[a-zA-Z0-9_$<>|[\]{}]+)?\s*=\s*\[/,
  },

  // 2. Objects Assignment
  {
    type: "object",
    regex:
      /\b(?:const|let|var|,)\s+([a-zA-Z0-9_$]+)\s*:\s*[a-zA-Z0-9_$<>|]+\s*(?:\s*=\s*\{)/,
  },
  {
    type: "object",
    regex: /\b(?:const|let|var|,)\s+([a-zA-Z0-9_$]+)\s*=\s*\{/,
  },
  { type: "object", regex: /\b(this\.[a-zA-Z0-9_$]+)\s*(?::[^=]+)?\s*=\s*\{/ },

  // 3. Object Keys (Nested Objects အတွင်းထဲက Keys များ)
  { type: "objectKey", regex: /^\s*([a-zA-Z0-9_$]+)\s*:\s*\{\s*$/ },
  { type: "objectKey", regex: /^\s*([a-zA-Z0-9_$]+)\s*:\s*\{/ },
];

export const IGNORED_KEYWORDS = [
  "return",
  "const",
  "let",
  "var",
  "true",
  "false",
  "null",
];

export function getColorByType(type: string): string {
  switch (type) {
    case "class":
    case "type":
      return "#f1c40f";
    case "method":
      return "#9b59b6";
    case "function":
      return "#3498db";
    case "arrow":
    case "callback":
      return "#1abc9c";
    case "object":
    case "objectKey":
    case "array":
      return "#2ecc71";
    case "for":
    case "for-in":
    case "for-of":
    case "while":
    case "do-while":
      return "#e67e22";
    case "if":
    case "else":
    case "switch":
      return "#e74c3c";
    case "try":
    case "catch":
      return "#d63031";
    default:
      return "var(--text-color, var(--primary-text-color, #ffffff))";
  }
}

export function getIconByType(type: string): string {
  let color = getColorByType(type);
  switch (type) {
    case "class":
    case "type":
      return `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: ${color}; vertical-align: middle; margin-right: 3px;"><path d="M4 1.5h2v1H5c-.6 0-1 .4-1 1v3c0 .6-.4 1-1 1h-.5v1H3c.6 0 1 .4 1 1v3c0 .6.4 1 1 1h1v1H4c-1.1 0-2-.9-2-2v-2.5c0-.6-.4-1-1-1v-1c.6 0 1-.4 1-1V3.5c0-1.1.9-2 2-2zm8 0h-2v1h1c.6 0 1 .4 1 1v3c0 .6.4 1 1 1h.5v1h-.5c-.6 0-1 .4-1 1v3c0 .6-.4 1-1 1h-1v1h2c1.1 0 2-.9 2-2v-2.5c0-.6.4-1 1-1v-1c-.6 0-1-.4-1-1V3.5c0-1.1-.9-2-2-2z"/></svg>`;
    case "method":
      return `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: ${color}; vertical-align: middle; margin-right: 3px;"><path d="M8 1l6 3.5v7L8 15l-6-3.5v-7L8 15l-6-3.5v-7L8 1zm4.8 4.1L8 2.3 3.2 5.1 8 7.9l4.8-2.8zM2.5 6.4v4.5l5 2.9V9.3l-5-2.9zm6 2.9v4.5l5-2.9V6.4l-5 2.9z"/></svg>`;
    case "function":
      return `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: ${color}; vertical-align: middle; margin-right: 3px;"><path d="M10.5 2h-2c-1.4 0-2.5 1.1-2.5 2.5V7H4v2h2v5h2V9h2.5V7H8V4.5c0-.3.2-.5.5-.5h2V2z"/></svg>`;
    case "arrow":
    case "callback":
      return `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: ${color}; vertical-align: middle; margin-right: 3px;"><path d="M2 4h6v2H2V4zm7.2 1.3l2.5 2.2-2.5 2.2 1.1 1.3 4-3.5-4-3.5-1.1 1.3zM2 10h6v2H2v-2z"/></svg>`;
    case "array":
      return `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: ${color}; vertical-align: middle; margin-right: 3px;"><path d="M3 1.5h3v1H4v11h2v1H3v-13zm10 0h-3v1h2v11h-2v1h3v-13z"/></svg>`;
    case "object":
    case "objectKey":
      return `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: ${color}; vertical-align: middle; margin-right: 3px;"><path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z"/></svg>`;
    case "for":
    case "for-in":
    case "for-of":
    case "while":
    case "do-while":
      return `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: ${color}; vertical-align: middle; margin-right: 3px;"><path d="M8 1a7 7 0 110 14A7 7 0 018 1zm0 2a5 5 0 100 10A5 5 0 008 3zm.5 2v3.2l2.1 2.1-.7.7-2.4-2.4V5h1z"/></svg>`;
    case "if":
    case "else":
    case "switch":
      return `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: ${color}; vertical-align: middle; margin-right: 3px;"><path d="M8 1L1 8l7 7 7-7-7-7zM3.4 8L8 3.4 12.6 8 8 12.6 3.4 8z"/></svg>`;
    case "try":
    case "catch":
      return `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: ${color}; vertical-align: middle; margin-right: 3px;"><path d="M8 15A7 7 0 108 1a7 7 0 000 14zm0-2a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-1-5.5a1 1 0 112 0v3a1 1 0 11-2 0v-3z"/></svg>`;
    default:
      return `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: ${color}; vertical-align: middle; margin-right: 3px;"><path d="M14 3v10H2V3h12zm1.5-1.5h-15v13h15v-13z"/></svg>`;
  }
}

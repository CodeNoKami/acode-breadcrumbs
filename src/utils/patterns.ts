/**
 * Supported active structural scope types matching lezerParser AST outputs
 */
export type ScopeType =
  | "class"
  | "interface"
  | "type"
  | "enum"
  | "method"
  | "function"
  | "arrow"
  | "property"
  | "object"
  | "array"
  | "variable"
  | "jsx";

/**
 * Resolves a hexadecimal color token optimized for dark/AMOLED themes with high contrast,
 * modern neon accents, visual balance, and distinct mapping for active scopes.
 * @param type - The registered layout scope type
 * @returns HEX color string or functional CSS variable fallback
 */
export function getColorByType(type: ScopeType | string): string {
  switch (type) {
    // 🧱 Object-Oriented Structures (Vibrant Gold & Ice Cyan)
    case "class":
      return "#FFB834"; // Vivid Amber Gold (Strong structural anchor)
    case "interface":
      return "#46D9FF"; // Bright Ice Cyan (Blueprint specifications)

    // 🏷️ Type & Enum Definitions (Teal Variants)
    case "type":
      return "#10E5FA"; // Electric Turquoise
    case "enum":
      return "#00F5D4"; // Neon Mint Cyan (Constant collection indicators)

    // ⚡ Logic & Execution Scopes (Deep Lavender, Cobalt Blue & Emerald Lambda)
    case "method":
      return "#D694FF"; // Vivid Neon Lavender (Object/Class members)
    case "function":
      return "#60A5FA"; // Premium Cobalt Blue (Global execution frames)
    case "arrow":
      return "#34D399"; // Emerald Mint Green (Inline Lambdas & Chain Callbacks)

    // 📦 Objects, Arrays & Property Bindings (Pistachio, Sage & Warm Canary)
    case "property":
      return "#99E65F"; // Bright Pistachio Green (Key-value access)
    case "object":
      return "#6EE7B7"; // Soft Teal Sage (Data configurations)
    case "array":
      return "#FCD34D"; // Warm Canary Yellow (Lists, Tuples & Matrices)
    case "variable":
      return "#4ADE80"; // Fresh Leaf Green (Block-scoped assignments)

    // ⚛️ UI / Virtual DOM Components
    case "jsx":
      return "#22D3EE"; // React Sky Cyan

    default:
      return "var(--text-color, var(--primary-text-color, #ffffff))";
  }
}

/**
 * Generates an inline vector SVG icon string mapped to specific structural scopes.
 * Optimized with balanced geometric stroke paths for professional 16x16 viewboxes.
 * @param type - The target element configuration type
 * @returns Clean, standard-compliant XML/SVG inline asset string
 */
export function getIconByType(type: ScopeType | string): string {
  const color = getColorByType(type);
  const svgStyle = `width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px; display:inline-block;"`;

  switch (type) {
    case "class":
      return `<svg ${svgStyle}><rect x="2" y="2" width="12" height="12" rx="2.5"/><circle cx="8" cy="8" r="2"/></svg>`;

    case "interface":
      return `<svg ${svgStyle}><rect x="2" y="2" width="12" height="12" rx="2.5" stroke-dasharray="2 1.5"/><path d="M6 8h4"/></svg>`;

    case "type":
      return `<svg ${svgStyle}><path d="M3 4h10M8 4v9M5.5 13h5"/></svg>`;

    case "enum":
      return `<svg ${svgStyle}><path d="M3 4h10M3 8h10M3 12h10M3 4h.01M3 8h.01M3 12h.01"/></svg>`;

    case "method":
      return `<svg ${svgStyle}><path d="M8 3l5 2.5V11l-5 2.5L3 11V5.5z M8 8v5.5 M8 8L3 5.5 M8 8l5-2.5"/></svg>`;

    case "function":
      return `<svg ${svgStyle}><path d="M5.5 13.5c1.2 0 1.8-1 2.2-3.5s.8-6.5 2.8-6.5M3.5 7.5h8"/></svg>`;

    case "arrow":
      return `<svg ${svgStyle}><path d="M3 8h10M9 4l4 4-4 4"/></svg>`;

    case "property":
      return `<svg ${svgStyle}><circle cx="5" cy="11" r="2"/><path d="M6.5 9.5l5.5-5.5M10 3l3 3"/></svg>`;

    case "object":
      return `<svg ${svgStyle}><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M5 6h6M5 10h4"/></svg>`;

    case "array":
      return `<svg ${svgStyle}><path d="M4.5 2H2v12h2.5M11.5 2H14v12h-2.5M5.5 8h5"/></svg>`;

    case "variable":
      return `<svg ${svgStyle}><rect x="2" y="3" width="12" height="10" rx="2"/><circle cx="6" cy="8" r="1.5"/><path d="M9 8h2"/></svg>`;

    case "jsx":
      return `<svg ${svgStyle}><path d="M5 4L1 8l4 4M11 4l4 4-4 4M9 3L7 13"/></svg>`;

    default:
      return `<svg ${svgStyle}><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M5 5.5L7.5 8 5 10.5"/></svg>`;
  }
}

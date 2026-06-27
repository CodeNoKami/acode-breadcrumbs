/**
 * Resolves a hexadecimal color token from Tailwind 500 Palette depending on the node type
 * @param type - The registered layout scope type string
 * @returns HEX color string or functional CSS variable fallback
 */
export function getColorByType(type: string): string {
  switch (type) {
    // 🧱 OOP Structures (Tailwind Amber & Violet)
    case "class":
    case "interface":
      return "#f59e0b"; // Tailwind Amber 500 (Warm Vivid Gold)
    case "method":
      return "#8b5cf6"; // Tailwind Violet 500 (Vivid Royal Purple)
    case "function":
      return "#3b82f6"; // Tailwind Blue 500 (Vivid Core Blue)

    // 🔗 Fluid Method Chains (Tailwind Purple) - Explicitly Added!
    case "method-chain":
      return "#a855f7"; // Tailwind Purple 500 (Bright Neon Purple)

    // 🏷️ Types & Properties (Tailwind Cyan & Sky)
    case "type":
    case "enum":
      return "#06b6d4"; // Tailwind Cyan 500 (Electric Cyan)
    case "property":
      return "#0ea5e9"; // Tailwind Sky 500 (Vivid Sky Blue)

    // 📦 Data Structures (Tailwind Lime & Yellow)
    case "object":
    case "objectKey":
      return "#84cc16"; // Tailwind Lime 500 (Vivid Fresh Lime)
    case "array":
      return "#eab308"; // Tailwind Yellow 500 (Vivid Canary Yellow)
    case "variable":
      return "#22c55e"; // Tailwind Green 500 (Standard Ecosystem Green)

    // 🚀 Execution Blocks & Events (Tailwind Emerald, Rose & Pink)
    case "arrow":
    case "callback":
      return "#10b981"; // Tailwind Emerald 500 (Mint Green)
    case "listener":
      return "#f43f5e"; // Tailwind Rose 500 (Vivid Event Rose)
    case "static-block":
      return "#ec4899"; // Tailwind Pink 500 (Vivid Fuchsia Pink)
    case "jsx":
      return "#14b8a6"; // Tailwind Teal 500 (Bright React Teal Green)

    // 🔄 Looping Scopes (Tailwind Orange 500)
    case "looping":
    case "for":
    case "while":
    case "do":
      return "#f97316"; // Vivid Sun Orange

    // 🛣️ Conditional Scopes (Tailwind Indigo 500)
    case "conditional":
    case "if":
    case "else-if":
    case "else":
    case "switch":
      return "#FE9A00"; // Vivid Amber  ( Tailwind Amber 500 )

    // 🛡️ Error Handling Scopes (Tailwind Red 500)
    case "try-catch-finally":
    case "try":
    case "catch":
    case "finally":
      return "#ef4444"; // Vivid Safety Red

    default:
      return "var(--text-color, var(--primary-text-color, #ffffff))";
  }
}

/**
 * Generates an inline vector SVG icon string mapped to specific structural scopes
 * @param type - The target element configuration type string
 * @returns Clean, standard-compliant XML/SVG inline asset string
 */
export function getIconByType(type: string): string {
  const color = getColorByType(type);
  const fillMode = type === "listener" ? color : "none";
  const svgStyle = `width="12" height="12" viewBox="0 0 16 16" fill="${fillMode}" stroke="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px; display:inline-block;"`;

  switch (type) {
    case "class":
    case "interface":
      return `<svg ${svgStyle}><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M5.5 5.5H4v5h1.5M10.5 5.5H12v5h-1.5"/></svg>`;
    case "method":
      return `<svg ${svgStyle}><path d="M8 1.5l5.5 3.2v6.6L8 14.5l-5.5-3.2V4.7z M2.5 4.7L8 8l5.5-3.3 M8 8v6.5"/></svg>`;
    case "function":
      return `<svg ${svgStyle}><path d="M11 2.5c-.8 0-1.5.7-1.8 1.5L6.8 13.5c-.3.8-1 1.5-1.8 1.5 M3.5 8h7"/></svg>`;
    case "property":
      return `<svg ${svgStyle}><circle cx="5" cy="11" r="2.5"/><path d="M7 9l6.5-6.5M10.5 5l1.5 1.5M12 3.5l1.5 1.5"/></svg>`;
    case "method-chain":
      return `<svg ${svgStyle}><circle cx="4" cy="4" r="1.5"/><circle cx="12" cy="12" r="1.5"/><path d="M4 5.5v2.5a2 2 0 0 0 2 2h4a2 2 0 0 1 2 2v2.5"/></svg>`;
    case "looping":
    case "for":
    case "while":
    case "do":
      return `<svg ${svgStyle}><path d="M2.5 8a5.5 5.5 0 1 1 1.5 3.5m0 0V9m0 2.5H6"/></svg>`;
    case "conditional":
    case "if":
    case "else-if":
    case "else":
    case "switch":
      return `<svg ${svgStyle}><path d="M4 2v12M4 8a3 3 0 0 0 3 3h5M11.5 8.5L14 11l-2.5 2.5"/></svg>`;
    case "try-catch-finally":
    case "try":
    case "catch":
    case "finally":
      return `<svg ${svgStyle}><path d="M2.5 5.5V3.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v2M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2M5.5 8h5"/></svg>`;
    case "type":
    case "enum":
      return `<svg ${svgStyle}><path d="M2.5 4.5h8.5L14.5 8l-3.5 3.5H2.5z M5.5 8h2"/></svg>`;
    case "variable":
      return `<svg ${svgStyle}><rect x="2.5" y="4.5" width="11" height="7" rx="1.5"/><path d="M6 6.5l2 3 2-3"/></svg>`;
    case "arrow":
    case "callback":
      return `<svg ${svgStyle}><path d="M2.5 5h6.5a2.5 2.5 0 0 1 0 5H2.5 M10.5 2.5L13.5 5l-3.5 2.5"/></svg>`;
    case "array":
      return `<svg ${svgStyle}><path d="M5.5 2.5H3v11h2.5M10.5 2.5H13v11h-2.5"/></svg>`;
    case "object":
    case "objectKey":
      return `<svg ${svgStyle}><rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M5.5 5.5h5M5.5 8.5h5M5.5 11.5h3"/></svg>`;
    case "static-block":
      return `<svg ${svgStyle}><rect x="3" y="6.5" width="10" height="7" rx="1"/><path d="M4.5 6.5V4a3.5 3.5 0 0 1 7 0v2.5"/></svg>`;
    case "jsx":
      return `<svg ${svgStyle}><ellipse cx="8" cy="8" rx="6.5" ry="2.5" transform="rotate(30 8 8)"/><ellipse cx="8" cy="8" rx="6.5" ry="2.5" transform="rotate(-30 8 8)"/><circle cx="8" cy="8" r="1" fill="${color}"/></svg>`;
    case "listener":
      return `<svg ${svgStyle}><path d="M9.5 1.5L2.5 9h5v5.5l7-7.5h-5z"/></svg>`;
    default:
      return `<svg ${svgStyle}><rect x="2" y="2" width="12" height="12" rx="1"/><path d="M5 5.5L7.5 8 5 10.5M9 10.5h2.5"/></svg>`;
  }
}

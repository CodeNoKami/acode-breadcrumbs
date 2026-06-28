/**
 * Resolves a hexadecimal color token optimized for dark/AMOLED themes with high contrast,
 * visual balance, eye care, and distinct mapping for each scope block.
 * @param type - The registered layout scope type string
 * @returns HEX color string or functional CSS variable fallback
 */
export function getColorByType(type: string): string {
  switch (type) {
    // 🧱 OOP Structures (Warm Amber, Soft Lavender, & Neon Blue)
    case "class":
    case "interface":
      return "#FFCB6B"; // Warm Amber Gold (High Visibility structural boundaries)
    case "method":
      return "#C792EA"; // Soft Lavender Purple (Distinct from method chains)
    case "function":
      return "#82B1FF"; // Neon Soft Blue (Global execution frames)

    // 🔗 Fluid Method Chains (Elegant Deep Violet - clearly distinct from Method Purple)
    case "method-chain":
      return "#A371F7"; // Elegant Deep Violet

    // 🏷️ Types & Properties (Electric Cyan & Pastel Emerald Keyframes)
    case "type":
    case "enum":
      return "#00E5FF"; // Electric Cyan (TS explicit type safety indicators)
    case "property":
    case "objectKey":
      return "#C3E88D"; // Pastel Emerald (Structural Object properties & Map keys)

    // 📦 Data Structures (Warm Yellow, Leaf Green, & Soft Mint)
    case "object":
      return "#A9FFB2"; // Pale Sage Green (Differentiates Object literals from Properties)
    case "array":
      return "#FFD54F"; // Soft Canary Yellow (Tuples, matrices, and collection structures)
    case "variable":
      return "#7EE787"; // Fresh Leaf Green (Standard localized block-scoped assignments)

    // 🚀 Execution Blocks & Events (Mint, Crimson, Coral, & Sky Teal)
    case "arrow":
    case "callback":
      return "#4ECC97"; // Mint Fresh Green (Lambda expressions & anonymous scopes)
    case "listener":
      return "#FB7185"; // Soft Crimson Salmon (Interactive hardware & browser event hooks)
    case "static-block":
      return "#FF5370"; // Premium Rose Red (Class initialization runtime components)
    case "jsx":
      return "#80DEEA"; // Bright Sky React Blue (Virtual DOM components & JSX/TSX tags)

    // 🔄 Looping Scopes (Vivid Energetic Tangerine)
    case "looping":
    case "for":
    case "while":
    case "do":
      return "#FB923C"; // Energetic Tangerine Orange

    // 🛣️ Conditional Scopes (Soft Coral Orange - completely distinct from Loop Tangerine)
    case "conditional":
    case "if":
    case "else-if":
    case "else":
    case "switch":
      return "#F78C6C"; // Soft Coral Orange

    // 🛡️ Error Handling Scopes (Vivid Safety Red)
    case "try-catch-finally":
    case "try":
    case "catch":
    case "finally":
      return "#EF4444"; // Balanced Safety Red (High-alert diagnostics capture)

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

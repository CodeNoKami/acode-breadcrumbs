export function getColorByType(type: string): string {
  switch (type) {
    case "class":
    case "interface":
      return "#ffcb6b"; // Modern Warm Amber / Gold
    case "type":
    case "enum":
      return "#00e5ff"; // Vibrant Electric Cyan
    case "method":
      return "#c792ea"; // Soft Lavender Purple (VS Code Style)
    case "function":
      return "#82b1ff"; // Neon Soft Blue
    case "arrow":
    case "callback":
      return "#4ecc97"; // Mint Fresh Green
    case "listener":
      return "#e84393"; // ⚡ Premium Event Pink (README Standard Palette)
    case "object":
    case "objectKey":
      return "#c3e88d"; // Light Olive / Pastel Emerald
    case "array":
      return "#ffd54f"; // Soft Canary Yellow
    case "variable":
      return "#7ee787"; // 🟢 Fresh Ecosystem Leaf Green (For Variables)
    case "method-chain":
      return "#a371f7"; // 🍇 Elegant Deep Violet for Fluid Chain Methods
    case "control-flow":
    case "for":
    case "while":
    case "if":
    case "else-if": // 💡 Fix: if-else context ပါ အရောင်တူ သတ်မှတ်ပေးခြင်း
    case "else":
    case "switch":
    case "try":
    case "catch":
    case "finally":
      return "#f78c6c"; // Soft Coral Orange
    case "static-block":
      return "#ff5370"; // Premium Rose Red
    case "jsx":
      return "#80deea"; // Bright Sky React Blue
    default:
      return "var(--text-color, var(--primary-text-color, #ffffff))";
  }
}

export function getIconByType(type: string): string {
  const color = getColorByType(type);

  // Base SVG wrapper styles for modern pixel-perfect alignment
  const svgStyle = `width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px; display:inline-block;"`;

  switch (type) {
    case "class":
    case "interface":
      // OOP / Class Bracket Box Icon
      return `<svg ${svgStyle}><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M6 5h1V11H6M10 5h-1V11H10"/></svg>`;

    case "type":
    case "enum":
      // Crisp Document / Definition Tag Icon
      return `<svg ${svgStyle}><path d="M3 1.5h6.5L13 5v9.5c0 .6-.4 1-1 1H3c-.6 0-1-.4-1-1v-12c0-.6.4-1 1-1zM9.5 1.5V5H13"/></svg>`;

    case "method":
      // Clean VS-Code Style Cube 3D Wireframe Icon
      return `<svg ${svgStyle}><path d="M8 1.5l5.5 3.2v6.6L8 14.5l-5.5-3.2V4.7L8 1.5zM2.5 4.7L8 8l5.5-3.3M8 8v6.5"/></svg>`;

    case "function":
      // Math/Code "f(x)" Pure Math Curvature Function Icon
      return `<svg ${svgStyle}><path d="M11 2.5c-.8 0-1.5.5-1.8 1.2L7.2 11c-.3.7-1 1.2-1.8 1.2M4 7h6.5"/></svg>`;

    case "arrow":
    case "callback":
      // Elegant Code Branch Arrow Loop Icon
      return `<svg ${svgStyle}><path d="M2 4.5h6.5a2.5 2.5 0 0 1 0 5H2M10.5 2l3 2.5-3 2.5"/></svg>`;

    case "array":
      // Pure Minimalist Square Bracket Icon
      return `<svg ${svgStyle}><path d="M5 2H2.5v12H5M11 2h2.5v12H11"/></svg>`;

    case "object":
    case "objectKey":
      // Modern Structural Bullet Object Node Icon
      return `<svg ${svgStyle}><rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M5.5 5h5M5.5 8h5M5.5 11h3"/></svg>`;

    case "variable":
      // 🟢 Minimalist Box-Identity 'V' Shape Variable Token Icon
      return `<svg ${svgStyle}><circle cx="8" cy="8" r="6.5"/><path d="M5.5 6.5L8 11.5l2.5-5"/></svg>`;

    case "method-chain":
      // 🍇 Modern Pipeline Stream Icon (Transforming / Fluid Chain Data Flow)
      return `<svg ${svgStyle}><path d="M2 3h5v4H2zm7 6h5v4H9zM4.5 7v4H9M11.5 3v6h-2.5"/></svg>`;

    case "control-flow":
    case "for":
    case "while":
    case "if":
    case "else-if": // 💡 Fix: if-else block အတွက် အိုင်ကွန် ချိန်ညှိခြင်း
    case "else":
    case "switch":
    case "try":
    case "catch":
    case "finally":
      // Dynamic Circular Direction/Loop Icon
      return `<svg ${svgStyle}><circle cx="8" cy="8" r="6.5"/><path d="M8 4.5V8l2 2"/></svg>`;

    case "static-block":
      // Secure / Initializer Safe Lock Icon
      return `<svg ${svgStyle}><rect x="3" y="6.5" width="10" height="7" rx="1"/><path d="M4.5 6.5V4a3.5 3.5 0 0 1 7 0v2.5"/></svg>`;

    case "jsx":
      // Geometric Atomic Orbit React-Helix Icon
      return `<svg ${svgStyle}><ellipse cx="8" cy="8" rx="6.5" ry="2.5" transform="rotate(30 8 8)"/><ellipse cx="8" cy="8" rx="6.5" ry="2.5" transform="rotate(-30 8 8)"/><circle cx="8" cy="8" r="1" fill="${color}"/></svg>`;

    case "listener":
      // ⚡ Sharp Lightning Web Event Hook Icon (Event Pink Filler Included)
      return `<svg ${svgStyle} fill="${color}"><path d="M9.5 1.5L2.5 9h5v5.5l7-7.5h-5z"/></svg>`;

    default:
      // Terminal Default Standard Block Icon
      return `<svg ${svgStyle}><rect x="2" y="2" width="12" height="12" rx="1"/><path d="M5 5.5L7.5 8 5 10.5M9 10.5h2.5"/></svg>`;
  }
}

import { PLUGIN_ID } from "../configs/constant";

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
  | "jsx"
  | "conditional"
  | "looping"
  | "tcf"
  | "listener";

declare var acode: any;

// Default high-contrast premium neon colors map definition
export const DEFAULT_BREADCRUMBS_COLORS: Record<string, string> = {
  class: "#FFB834",
  interface: "#46D9FF",
  type: "#10E5FA",
  enum: "#00F5D4",
  method: "#D694FF",
  function: "#60A5FA",
  arrow: "#34D399",
  property: "#99E65F",
  object: "#6EE7B7",
  array: "#FCD34D",
  variable: "#4ADE80",
  jsx: "#22D3EE",
  conditional: "#d68600",
  looping: "#52ff72",
  tcf: "#fa3b49",
  listener: "#fa3b81",
};

/**
 * Resolves a hexadecimal color token optimized for dark/AMOLED themes with high contrast,
 * modern neon accents, visual balance, and distinct mapping for active scopes.
 * Supports custom dynamic configuration bridges loaded via Acode user settings JSON payload.
 * @param type - The registered layout scope type
 * @returns HEX color string or functional CSS variable fallback
 */
export function getColorByType(type: ScopeType | string): string {
  try {
    const settings = acode.require("settings");
    const pluginSettings = settings.value[PLUGIN_ID] || {};
    const customHighlighting = pluginSettings.breadcrumbsHighlighting || {};

    // စိတ်ကြိုက် သတ်မှတ်ထားတဲ့ JSON ထဲမှာ အရောင်ရှိရင် ၎င်းကို ဦးစားပေးသုံးမည်
    if (customHighlighting && customHighlighting[type]) {
      return customHighlighting[type];
    }
  } catch (e) {
    // Dynamic settings lookup fails during early initialization bootstrap safely catch
  }

  // Fallback: Default Premium Neon Palette
  return (
    DEFAULT_BREADCRUMBS_COLORS[type] ||
    "var(--text-color, var(--primary-text-color, #ffffff))"
  );
}

/**
 * Generates an inline vector SVG icon string mapped to specific structural scopes.
 * Optimized with balanced geometric stroke paths for professional 16x16 viewboxes.
 * @param type - The target element configuration type
 * @param customColor - Optional prioritized override token
 * @returns Clean, standard-compliant XML/SVG inline asset string
 */
export function getIconByType(
  type: ScopeType | string,
  customColor?: string,
): string {
  const color = customColor || getColorByType(type);
  const svgStyle = `width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px; display:inline-block;"`;

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
    case "conditional":
      // Flowchart Decision Diamond (If/Else Branching Representation)
      return `<svg ${svgStyle}><path d="M8 2.5l5.5 5.5-5.5 5.5-5.5-5.5z"/></svg>`;
    case "looping":
      // Circular Progress Vector with Arrow (Iteration/Recursion Representation)
      return `<svg ${svgStyle}><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9L14 6.5"/><path d="M14 2.5v4h-4"/></svg>`;
    case "tcf":
      // Defensive Wrapper Shield (Exception Interception/Safety Shield Representation)
      return `<svg ${svgStyle}><path d="M3.5 3h9v4.5c0 3.2-2 6-4.5 7-2.5-1-4.5-3.8-4.5-7V3z"/></svg>`;
    case "listener":
      // ⚡ Event Listener/Trigger (Lightning Bolt Representation)
      return `<svg ${svgStyle}><path d="M9.5 1.5 L3.5 8.5 H7.5 L5.5 14.5 L12.5 7.5 H8.5 Z"/></svg>`;

    default:
      return `<svg ${svgStyle}><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M5 5.5L7.5 8 5 10.5"/></svg>`;
  }
}

/**
 * လက်ရှိဖိုင်၏ Extension အလိုက် Premium Thin-Line SVG Icon ကို ထုတ်ပေးသည်။
 * @param ext - File Extension (e.g., 'js', 'ts', 'jsx', 'tsx')
 * @returns string - SVG HTML string
 */
export function getFileIconByType(ext: string): string {
  const normalizedExt = ext.toLowerCase().trim();

  switch (normalizedExt) {
    case "js":
      // 💛 Material VSCode JavaScript (Official Yellow Badge Style)
      return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 4px;">
        <rect x="1" y="1" width="14" height="14" rx="1.5" fill="#F7DF1E"/>
        <path d="M7.5 11.5c0 .5-.2.9-.5 1.1s-.7.3-1.2.3c-.4 0-.8-.1-1.1-.2v-1.1c.3.1.6.2.9.2.4 0 .6-.2.6-.6V6.5h1.3v5zm4.3-1.4c0 .5-.2.9-.6 1.2s-1 .4-1.7.4c-.4 0-.8-.1-1.2-.2v-1.1c.4.2.8.3 1.2.3.5 0 .8-.2.8-.5 0-.3-.2-.5-.7-.7l-.5-.2c-.6-.2-1.1-.5-1.3-.8-.3-.3-.4-.7-.4-1.2 0-.5.2-.9.6-1.2.4-.3.9-.4 1.6-.4.4 0 .8.1 1.1.2v1.1c-.3-.1-.6-.2-.9-.2-.4 0-.7.1-.7.4 0 .2.2.4.6.5l.4.1c.7.2 1.1.5 1.4.8.2.4.3.8.3 1.3z" fill="#000000"/>
      </svg>`;
    case "ts":
      // 💙 Material VSCode TypeScript (Official Blue Badge Style)
      return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 4px;">
        <rect x="1" y="1" width="14" height="14" rx="1.5" fill="#3178C6"/>
        <path d="M5.9 6.5H3.5v1.1h.9v5.2h1.3V7.6h.9V6.5zm4.8 3.6c0 .5-.2.9-.6 1.2s-1 .4-1.7.4c-.4 0-.8-.1-1.2-.2v-1.1c.4.2.8.3 1.2.3.5 0 .8-.2.8-.5 0-.3-.2-.5-.7-.7l-.5-.2c-.6-.2-1.1-.5-1.3-.8-.3-.3-.4-.7-.4-1.2 0-.5.2-.9.6-1.2.4-.3.9-.4 1.6-.4.4 0 .8.1 1.1.2v1.1c-.3-.1-.6-.2-.9-.2-.4 0-.7.1-.7.4 0 .2.2.4.6.5l.4.1c.7.2 1.1.5 1.4.8.3.4.3.8.3 1.3z" fill="#FFFFFF"/>
      </svg>`;
    case "jsx":
      // ⚛️ Material VSCode React JS (Cyan Atom Outline Style)
      return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 4px;">
        <g stroke="#00D8FF" stroke-width="1.1" stroke-miterlimit="10">
          <ellipse cx="8" cy="8" rx="6.5" ry="2.4" transform="rotate(30 8 8)"/>
          <ellipse cx="8" cy="8" rx="6.5" ry="2.4" transform="rotate(90 8 8)"/>
          <ellipse cx="8" cy="8" rx="6.5" ry="2.4" transform="rotate(150 8 8)"/>
        </g>
        <circle cx="8" cy="8" r="1.1" fill="#00D8FF"/>
      </svg>`;
    case "tsx":
      // ⚛️ Material VSCode React TS (Deep Blue TS-React Style)
      return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 4px;">
        <g stroke="#2F74C4" stroke-width="1.1" stroke-miterlimit="10">
          <ellipse cx="8" cy="8" rx="6.5" ry="2.4" transform="rotate(30 8 8)"/>
          <ellipse cx="8" cy="8" rx="6.5" ry="2.4" transform="rotate(90 8 8)"/>
          <ellipse cx="8" cy="8" rx="6.5" ry="2.4" transform="rotate(150 8 8)"/>
        </g>
        <circle cx="8" cy="8" r="1.1" fill="#2F74C4"/>
      </svg>`;
    default:
      // 📄 Material VSCode Document Default (Sleek Folded Document Style)
      return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 4px;">
        <path d="M3.5 1.5h6.5l3.5 3.5v9.5c0 .55-.45 1-1 1h-9c-.55 0-1-.45-1-1v-12c0-.55xl.45-1 1-1z" fill="#858585" opacity="0.15"/>
        <path d="M3.5 1.5h6.5l3.5 3.5v9.5c0 .55-.45 1-1 1h-9c-.55 0-1-.45-1-1v-12c0-.55.45-1 1-1z" stroke="#858585" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M10 1.5V5h3.5" stroke="#858585" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
  }
}

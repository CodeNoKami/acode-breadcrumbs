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
  | "jsx";

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
};

/**
 * Resolves a hexadecimal color token optimized for dark/AMOLED themes with high contrast,
 * modern neon accents, visual balance, and distinct mapping for active scopes.
 * Supports custom dynamic configuration bridges loaded via Acode user settings JSON payload.
 * * @param type - The registered layout scope type
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
 * @returns Clean, standard-compliant XML/SVG inline asset string
 */
export function getIconByType(
  type: ScopeType | string,
  customColor?: string,
): string {
  // 🌟 ပြင်ဆင်လိုက်သည်- Custom Color ပါလာရင် သုံးမယ်၊ မပါမှ Default Color ယူမယ်
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
      return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 4px;">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="#E5C07B" stroke-width="1.3"/>
        <text x="4" y="11" fill="#E5C07B" font-family="monospace" font-size="7" font-weight="bold">JS</text>
      </svg>`;
    case "ts":
      return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 4px;">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="#61AFEF" stroke-width="1.3"/>
        <text x="4" y="11" fill="#61AFEF" font-family="monospace" font-size="7" font-weight="bold">TS</text>
      </svg>`;
    case "jsx":
      return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 4px;">
        <ellipse cx="8" cy="8" rx="6" ry="2" stroke="#4FC1FF" stroke-width="1.3" transform="rotate(30 8 8)"/>
        <ellipse cx="8" cy="8" rx="6" ry="2" stroke="#4FC1FF" stroke-width="1.3" transform="rotate(90 8 8)"/>
        <ellipse cx="8" cy="8" rx="6" ry="2" stroke="#4FC1FF" stroke-width="1.3" transform="rotate(150 8 8)"/>
        <circle cx="8" cy="8" r="1.2" fill="#4FC1FF"/>
      </svg>`;
    case "tsx":
      return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 4px;">
        <ellipse cx="8" cy="8" rx="6" ry="2" stroke="#56B6C2" stroke-width="1.3" transform="rotate(30 8 8)"/>
        <ellipse cx="8" cy="8" rx="6" ry="2" stroke="#56B6C2" stroke-width="1.3" transform="rotate(90 8 8)"/>
        <ellipse cx="8" cy="8" rx="6" ry="2" stroke="#56B6C2" stroke-width="1.3" transform="rotate(150 8 8)"/>
        <circle cx="8" cy="8" r="1.2" fill="#56B6C2"/>
      </svg>`;
    default:
      return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 4px;">
        <path d="M3 2.5C3 1.67157 3.67157 1 4.5 1H10L13.5 4.5V13.5C13.5 14.3284 12.8284 15 12 15H4.5C3.67157 15 3 14.3284 3 13.5V2.5Z" stroke="#ABB2BF" stroke-width="1.3"/>
        <path d="M9.5 1V4.5H13" stroke="#ABB2BF" stroke-width="1.3"/>
      </svg>`;
  }
}

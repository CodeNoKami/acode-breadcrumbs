import { PLUGIN_ID } from "../configs/constant";
import { getColorByType } from "./patterns";

/**
 * Resolves a custom hex color code based on the provided AST node type.
 * It dynamically evaluates active user preferences from the Acode application settings.
 * If no custom theme override is found, it falls back to default preset color patterns.
 *
 * @param type - The syntax node type string extracted from the abstract syntax tree (AST).
 * @returns A valid CSS hex color string assigned to the given node type.
 *
 * @example
 * ```typescript
 * const color = getCustomColor("MethodDefinition");
 * // Returns user-configured custom color or the default fallback pattern color
 * ```
 */
export function getCustomColor(type: string): string {
  // Retrieve the global settings module from Acode application instance
  const settings: any = acode.require("settings");

  // Safely extract the plugin-specific configuration state or default to an empty object
  const state = settings.value[PLUGIN_ID] || {};
  const lowerType = type ? type.toLowerCase() : "";

  // Exact match lookups for structural code features and control flow blocks
  if (lowerType === "conditional") return state.colorConditional || "#f59e0b";
  if (lowerType === "looping") return state.colorLooping || "#3b82f6";
  if (lowerType === "tcf") return state.colorTcf || "#a855f7";
  if (lowerType === "listener") return state.colorListener || "#fa3b81";

  // Substring group checks for dynamic architectural theme matching
  if (lowerType.includes("method"))
    return state.colorMethod || getColorByType(type);
  if (lowerType.includes("arrow"))
    return state.colorArrow || getColorByType(type);
  if (lowerType.includes("function"))
    return state.colorFunction || getColorByType(type);
  if (lowerType.includes("class"))
    return state.colorClass || getColorByType(type);
  if (lowerType.includes("interface"))
    return state.colorInterface || getColorByType(type);
  if (lowerType.includes("type"))
    return state.colorType || getColorByType(type);
  if (lowerType.includes("enum"))
    return state.colorEnum || getColorByType(type);
  if (lowerType.includes("property"))
    return state.colorProperty || getColorByType(type);
  if (lowerType.includes("object"))
    return state.colorObject || getColorByType(type);
  if (lowerType.includes("array"))
    return state.colorArray || getColorByType(type);
  if (lowerType.includes("jsx") || lowerType.includes("element"))
    return state.colorJsx || getColorByType(type);

  // Default fallback assignment for standard variables or generic tokens
  return state.colorVariable || getColorByType(type);
}

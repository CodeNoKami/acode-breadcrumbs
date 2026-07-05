import { PLUGIN_ID } from "../configs/constant";
import { getColorByType } from "./patterns";

// Node မျိုးအစားအလိုက် တောင်းဆိုထားသော Custom Color များကို ခွဲခြားသတ်မှတ်ပေးမည့် Helper
export function getCustomColor(type: string): string {
  const settings: any = acode.require("settings");
  const state = settings.value[PLUGIN_ID] || {};
  const lowerType = type ? type.toLowerCase() : "";

  //  Structural Features Dynamic Theme Matching
  if (lowerType === "conditional") return state.colorConditional || "#f59e0b";
  if (lowerType === "looping") return state.colorLooping || "#3b82f6";
  if (lowerType === "tcf") return state.colorTcf || "#a855f7";
  if (lowerType === "listener") return state.colorListener || "#fa3b81";

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

  return state.colorVariable || getColorByType(type);
}

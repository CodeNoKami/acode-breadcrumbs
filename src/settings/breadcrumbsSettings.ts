import { PLUGIN_ID } from "../configs/constant";
import type { BreadcrumbsPlugin } from "../breadcrumbsPlugin";

// Full 15 Node Types Prompt UI Mapping Configuration
//
// This is a factory (not a bare object) so the settings module never needs
// to import the singleton plugin instance directly — main.ts hands it the
// instance it already created, keeping the dependency direction one-way:
// main.ts -> breadcrumbsPlugin.ts + breadcrumbsSettings.ts
export function createBreadcrumbsSettings(pluginInstance: BreadcrumbsPlugin) {
  return {
    get list() {
      const settings = acode.require("settings");
      const pluginState = settings.value[PLUGIN_ID] || {};
      return [
        {
          key: "showIcons",
          text: "Show Scope Icons",
          info: "Display structure and layout icons on the breadcrumbs bar and inside the code popups.",
          checkbox: !!pluginState.showIcons,
        },
        {
          key: "disablePreviewPopup",
          text: "Disable Preview Popup",
          info: "Turn off the code preview card popup when long-pressing structural tokens.",
          checkbox: !!pluginState.disablePreviewPopup,
        },
        // New Block Segment Control Switches (On/Off)
        {
          key: "renderListener",
          text: "Render Event Listener Blocks",
          info: "Show event listeners in the breadcrumbs trail.",
          checkbox: !!pluginState.renderConditional,
        },
        {
          key: "renderConditional",
          text: "Render Conditional Blocks",
          info: "Show conditionals (if, else if, else, switch) in the breadcrumbs trail.",
          checkbox: !!pluginState.renderListener,
        },
        {
          key: "renderLooping",
          text: "Render Looping Blocks",
          info: "Show structural loops (for, for-in, for-of, while, do) in the breadcrumbs trail.",
          checkbox: !!pluginState.renderLooping,
        },
        {
          key: "renderTcf",
          text: "Render Try-Catch Blocks",
          info: "Show error handling constructs (try, catch, finally) in the breadcrumbs trail.",
          checkbox: !!pluginState.renderTcf,
        },
        {
          key: "previewDelay",
          text: "Popup Preview Delay",
          info: "Configure the long-press holding duration required to trigger the code block preview popup.",
          value: pluginState.previewDelay || "480",
          select: [
            ["300", "Fast (300ms)"],
            ["480", "Normal (480ms)"],
            ["800", "Slow (800ms)"],
          ],
        },
        {
          key: "pollingDebounceTimeout",
          text: "Debounce Polling Timeout",
          info: "Performance processing window delay (ms) for structural code re-indexing parsing requests.",
          value: pluginState.pollingDebounceTimeout || "150",
          select: [
            ["100", "Aggressive (100ms)"],
            ["150", "Balanced (150ms)"],
            ["250", "Relaxed (250ms)"],
            ["400", "Eco Battery Saver (400ms)"],
          ],
        },
        {
          key: "colorConditional",
          text: "Conditional Block Color",
          info: "Set structural highlighting hex code for Conditions (if / switch).",
          value: pluginState.colorConditional || "#d68600",
          prompt: true,
          promptType: "text",
          placeholder: "#d68600",
        },
        {
          key: "colorLooping",
          text: "Looping Block Color",
          info: "Set structural highlighting hex code for Loop Statements.",
          value: pluginState.colorLooping || "#52ff72",
          prompt: true,
          promptType: "text",
          placeholder: "#52ff72",
        },
        {
          key: "colorTcf",
          text: "Try-Catch-Finally Color",
          info: "Set structural highlighting hex code for Try / Catch / Finally blocks.",
          value: pluginState.colorTcf || "#fa3b49",
          prompt: true,
          promptType: "text",
          placeholder: "#fa3b49",
        },
        {
          key: "colorListener",
          text: "Add or Remove EventListener Color",
          info: "Set structural highlighting hex code for .addEventListener, .removeEventListener, .on or .off blocks.",
          value: pluginState.colorListener || "#fa3b81",
          prompt: true,
          promptType: "text",
          placeholder: "#fa3b81",
        },
        {
          key: "colorClass",
          text: "Class Block Color",
          info: "Set structural highlighting hex code for Classes.",
          value: pluginState.colorClass || "#FFB834",
          prompt: true,
          promptType: "text",
          placeholder: "#FFB834",
        },
        {
          key: "colorInterface",
          text: "Interface Block Color",
          info: "Set structural highlighting hex code for Interfaces.",
          value: pluginState.colorInterface || "#46D9FF",
          prompt: true,
          promptType: "text",
          placeholder: "#46D9FF",
        },
        {
          key: "colorType",
          text: "Type Block Color",
          info: "Set structural highlighting hex code for Types/Type Aliases.",
          value: pluginState.colorType || "#10E5FA",
          prompt: true,
          promptType: "text",
          placeholder: "#10E5FA",
        },
        {
          key: "colorEnum",
          text: "Enum Block Color",
          info: "Set structural highlighting hex code for Enums.",
          value: pluginState.colorEnum || "#00F5D4",
          prompt: true,
          promptType: "text",
          placeholder: "#00F5D4",
        },
        {
          key: "colorMethod",
          text: "Method Block Color",
          info: "Set structural highlighting hex code for Methods.",
          value: pluginState.colorMethod || "#D694FF",
          prompt: true,
          promptType: "text",
          placeholder: "#D694FF",
        },
        {
          key: "colorFunction",
          text: "Function Block Color",
          info: "Set structural highlighting hex code for Functions.",
          value: pluginState.colorFunction || "#60A5FA",
          prompt: true,
          promptType: "text",
          placeholder: "#60A5FA",
        },
        {
          key: "colorArrow",
          text: "Arrow Function Color",
          info: "Set structural highlighting hex code for Arrow Functions.",
          value: pluginState.colorArrow || "#34D399",
          prompt: true,
          promptType: "text",
          placeholder: "#34D399",
        },
        {
          key: "colorProperty",
          text: "Property Block Color",
          info: "Set structural highlighting hex code for Object Properties.",
          value: pluginState.colorProperty || "#99E65F",
          prompt: true,
          promptType: "text",
          placeholder: "#99E65F",
        },
        {
          key: "colorObject",
          text: "Object Block Color",
          info: "Set structural highlighting hex code for Objects.",
          value: pluginState.colorObject || "#6EE7B7",
          prompt: true,
          promptType: "text",
          placeholder: "#6EE7B7",
        },
        {
          key: "colorArray",
          text: "Array Block Color",
          info: "Set structural highlighting hex code for Arrays.",
          value: pluginState.colorArray || "#FCD34D",
          prompt: true,
          promptType: "text",
          placeholder: "#FCD34D",
        },
        {
          key: "colorVariable",
          text: "Variable Block Color",
          info: "Set structural highlighting hex code for Variables.",
          value: pluginState.colorVariable || "#4ADE80",
          prompt: true,
          promptType: "text",
          placeholder: "#4ADE80",
        },
        {
          key: "colorJsx",
          text: "JSX / TSX Element Color",
          info: "Set structural highlighting hex code for JSX Components and XML Elements.",
          value: pluginState.colorJsx || "#22D3EE",
          prompt: true,
          promptType: "text",
          placeholder: "#22D3EE",
        },
      ];
    },
    cb: (key: string, value: any) => {
      const settings = acode.require("settings");
      if (!settings.value[PLUGIN_ID]) {
        settings.value[PLUGIN_ID] = {};
      }

      // Auto prefix '#' formatting handler
      if (key.startsWith("color") && typeof value === "string") {
        let trimmedColor = value.trim();
        if (
          !trimmedColor.startsWith("#") &&
          /^[0-9A-Fa-f]{3,8}$/.test(trimmedColor)
        ) {
          trimmedColor = "#" + trimmedColor;
        }
        settings.value[PLUGIN_ID][key] = trimmedColor;
      } else {
        settings.value[PLUGIN_ID][key] = value;
      }

      settings.update(true);

      pluginInstance.clearCache();
      if (editorManager && editorManager.editor) {
        pluginInstance.updateBreadcrumbs(editorManager.editor);
      }
    },
  };
}

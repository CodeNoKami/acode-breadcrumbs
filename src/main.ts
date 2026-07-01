import { PLUGIN_ID } from "./configs/constant";
import { EditorView } from "@codemirror/view";
import { syntaxTree, ensureSyntaxTree } from "@codemirror/language";
import { parser as jsParser } from "@lezer/javascript";
import { highlightCode, classHighlighter } from "@lezer/highlight";
import { resolveBreadcrumbs, ScopeBlock } from "./utils/lezerParser";
import {
  getIconByType,
  getColorByType,
  getFileIconByType,
} from "./utils/patterns";

declare var editorManager: any;
declare var acode: any;

export class BreadcrumbsPlugin {
  private container: HTMLDivElement | null = null;
  private pathContainer: HTMLSpanElement | null = null;
  private prefixTextEl: HTMLSpanElement | null = null;
  private prefixIconContainer: HTMLSpanElement | null = null;
  private intervalId: any = null;
  private debounceTimeout: any = null;
  private pressTimer: any = null;
  private onFontChangeHandler: ((newAppFont: string) => void) | null = null;
  private currentEditor: EditorView | null = null;

  // --- Optimization State Caches ---
  private lastDocString: string = "";
  private lastPos: number = -1; // Track last position for aggressive early return
  private lastScopesFingerprint: string = "";
  private activePopupCleanup: (() => void) | null = null;
  private blockClickBypass: boolean = false;

  //  Setting တွင် အရောင်ပြောင်းလိုက်ပါက UI ချက်ချင်း update ဖြစ်စေရန် cache ရှင်းပေးမည့် method
  public clearCache(): void {
    this.lastDocString = "";
    this.lastPos = -1;
    this.lastScopesFingerprint = "";
  }

  // Helper to safely extract native tree without Bundle Mismatch error
  private getNativeTree(state: any): any {
    if (!state) return null;
    try {
      // Reflection-based extraction to bypass the Lezer Instance Hazard
      // CodeMirror stores values in an internal array within the state object.
      // Although minified, the internal array object keys can be iterated.
      for (const key of Object.keys(state)) {
        const val = state[key];
        if (Array.isArray(val)) {
          for (const item of val) {
            // Looking for the LanguageState object which has the .tree property
            if (item && item.tree && typeof item.tree === "object") {
              const t = item.tree;
              // Validate it's a real Lezer Tree by checking non-minified props
              if (
                t.type &&
                Array.isArray(t.children) &&
                Array.isArray(t.positions) &&
                typeof t.length === "number"
              ) {
                return t;
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to extract native tree:", e);
    }
    return null;
  }

  //  Node မျိုးအစားအလိုက် တောင်းဆိုထားသော Custom Color များကို ခွဲခြားသတ်မှတ်ပေးမည့် Helper
  private getCustomColor(type: string): string {
    const settings: any = acode.require("settings");
    const state = settings.value[PLUGIN_ID] || {};
    const lowerType = type ? type.toLowerCase() : "";

    //  Structural Features Dynamic Theme Matching
    if (lowerType === "conditional") return state.colorConditional || "#f59e0b";
    if (lowerType === "looping") return state.colorLooping || "#3b82f6";
    if (lowerType === "tcf") return state.colorTcf || "#a855f7";

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

  public async init(baseUrl: string, $page: any, cache: any): Promise<void> {
    const _ = { baseUrl, $page, cache };

    // Fix B: Clear any pre-existing initialization intervals to prevent multi-init leaks
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Initialize default plugin settings safely
    const settings: any = acode.require("settings");
    if (!settings.value[PLUGIN_ID]) {
      settings.value[PLUGIN_ID] = {
        showIcons: true,
        disablePreviewPopup: false,
        renderConditional: false,
        renderLooping: false,
        renderTcf: false,
        previewDelay: "480",
        pollingDebounceTimeout: "150",
        colorConditional: "#f59e0b",
        colorLooping: "#3b82f6",
        colorTcf: "#a855f7",
        colorClass: "#FFB834",
        colorInterface: "#46D9FF",
        colorType: "#10E5FA",
        colorEnum: "#00F5D4",
        colorMethod: "#D694FF",
        colorFunction: "#60A5FA",
        colorArrow: "#34D399",
        colorProperty: "#99E65F",
        colorObject: "#6EE7B7",
        colorArray: "#FCD34D",
        colorVariable: "#4ADE80",
        colorJsx: "#22D3EE",
      };
      settings.update(false);
    } else {
      // Backwards compatibility layer for existing installations adding new keys
      const state = settings.value[PLUGIN_ID];
      if (state.disablePreviewPopup === undefined)
        state.disablePreviewPopup = false;
      if (state.renderConditional === undefined) state.renderConditional = true;
      if (state.renderLooping === undefined) state.renderLooping = true;
      if (state.renderTcf === undefined) state.renderTcf = true;
      if (state.pollingDebounceTimeout === undefined)
        state.pollingDebounceTimeout = "150";
      if (state.colorConditional === undefined)
        state.colorConditional = "#f59e0b";
      if (state.colorLooping === undefined) state.colorLooping = "#3b82f6";
      if (state.colorTcf === undefined) state.colorTcf = "#a855f7";
      if (state.colorClass === undefined) state.colorClass = "#FFB834";
      if (state.colorInterface === undefined) state.colorInterface = "#46D9FF";
      if (state.colorType === undefined) state.colorType = "#10E5FA";
      if (state.colorEnum === undefined) state.colorEnum = "#00F5D4";
      if (state.colorMethod === undefined) state.colorMethod = "#D694FF";
      if (state.colorFunction === undefined) state.colorFunction = "#60A5FA";
      if (state.colorArrow === undefined) state.colorArrow = "#34D399";
      if (state.colorProperty === undefined) state.colorProperty = "#99E65F";
      if (state.colorObject === undefined) state.colorObject = "#6EE7B7";
      if (state.colorArray === undefined) state.colorArray = "#FCD34D";
      if (state.colorVariable === undefined) state.colorVariable = "#4ADE80";
      if (state.colorJsx === undefined) state.colorJsx = "#22D3EE";
      settings.update(false);
    }

    this.intervalId = setInterval(() => {
      const editor = editorManager.editor;
      if (editor && editor.dom) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.setupBreadcrumbs(editor);
      }
    }, 200);
  }

  private setupBreadcrumbs(editor: EditorView) {
    if (this.container) this.container.remove();
    this.currentEditor = editor;

    const settings: any = acode.require("settings");
    let appFont: string = settings.get("appFont") || "monospace";

    this.container = document.createElement("div");
    this.container.id = "acode-breadcrumbs-bar";
    this.container.style.cssText = `
      display: flex; align-items: center; gap: 6px; padding: 6px 25px 6px 12px;
      background-color: var(--primary-color, #1e1e1e); 
      color: var(--text-color, var(--primary-text-color, #ffffff));
      font-family: ${appFont}, monospace; font-size: 11px; box-shadow: 0 2px 4px var(--box-shadow-color, rgba(0,0,0,0.2));
      overflow-x: auto; overflow-y: hidden; white-space: nowrap; box-sizing: border-box;
      z-index: 10; height: 28px;
    `;

    let currentFile = editorManager.activeFile;
    let filename = currentFile ? currentFile.filename : "Breadcrumbs";
    let fileExtension = currentFile ? filename.split(".").pop() || "" : "";

    const prefix = document.createElement("span");
    prefix.style.cssText =
      "display: inline-flex; align-items: center; color: var(--text-color, var(--primary-text-color, #ffffff)); flex-shrink: 0; gap: 4px;";

    this.prefixIconContainer = document.createElement("span");
    this.prefixIconContainer.style.cssText =
      "display: inline-flex; align-items: center; flex-shrink: 0;";
    this.prefixIconContainer.innerHTML = getFileIconByType(fileExtension);
    prefix.appendChild(this.prefixIconContainer);

    this.prefixTextEl = document.createElement("span");
    this.prefixTextEl.textContent = filename;
    prefix.appendChild(this.prefixTextEl);

    this.container.appendChild(prefix);

    const baseSeparator = document.createElement("span");
    baseSeparator.style.cssText =
      "display: inline-flex; align-items: center; color: var(--text-color, var(--primary-text-color, #ffffff)); opacity: 0.7; flex-shrink: 0;";
    baseSeparator.innerHTML = `<i style="font-size: 15px; display: inline-block; vertical-align: middle;" class="icon keyboard_arrow_right"></i>`;
    this.container.appendChild(baseSeparator);

    this.pathContainer = document.createElement("span");
    this.pathContainer.style.cssText =
      "display: inline-flex; align-items: center; gap: 6px;";
    this.container.appendChild(this.pathContainer);

    this.onFontChangeHandler = (newAppFont: string) => {
      if (this.container)
        this.container.style.fontFamily = `${newAppFont}, monospace`;
    };
    settings.on("update:appFont", this.onFontChangeHandler);

    editor.dom.prepend(this.container);

    if (editorManager && editorManager.on) {
      editorManager.off("switch-file", this.onFileSwitched);
      editorManager.on("switch-file", this.onFileSwitched);
    }

    this.injectUpdateListener(editor);
    this.queueUpdate(editor);
  }

  private onFileSwitched = () => {
    const editor = editorManager.editor;
    if (editor && editor.dom) {
      if (this.currentEditor && this.currentEditor.dom) {
        this.currentEditor.dom.removeEventListener(
          "focusin",
          this.onEditorUpdate,
        );
        this.currentEditor.dom.removeEventListener(
          "click",
          this.onEditorUpdate,
        );
      }

      this.lastDocString = "";
      this.lastPos = -1;
      this.lastScopesFingerprint = "";

      this.currentEditor = editor;
      if (this.container) {
        editor.dom.prepend(this.container);
      }
      this.injectUpdateListener(editor);
      this.queueUpdate(editor);
    }
  };

  private injectUpdateListener(editor: EditorView) {
    document.removeEventListener(
      "selectionchange",
      this.onGlobalSelectionChange,
    );
    document.addEventListener("selectionchange", this.onGlobalSelectionChange);

    if (editor.dom) {
      editor.dom.removeEventListener("focusin", this.onEditorUpdate);
      editor.dom.addEventListener("focusin", this.onEditorUpdate);
      editor.dom.removeEventListener("click", this.onEditorUpdate);
      editor.dom.addEventListener("click", this.onEditorUpdate);
    }
  }

  private queueUpdate(editor: EditorView) {
    if (this.debounceTimeout) clearTimeout(this.debounceTimeout);

    const settings: any = acode.require("settings");
    const pluginSettings = settings.value[PLUGIN_ID] || {};
    const delayDuration = parseInt(
      pluginSettings.pollingDebounceTimeout || "150",
      10,
    );

    this.debounceTimeout = setTimeout(() => {
      this.updateBreadcrumbs(editor);
    }, delayDuration);
  }

  private onGlobalSelectionChange = () => {
    if (this.currentEditor) this.queueUpdate(this.currentEditor);
  };

  private onEditorUpdate = () => {
    if (this.currentEditor) this.queueUpdate(this.currentEditor);
  };

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  private highlightCodeSnippet(
    code: string,
    filename: string,
    block?: ScopeBlock,
  ): string {
    try {
      let dialect = "";
      const lowerName = filename.toLowerCase();

      if (lowerName.endsWith(".tsx")) dialect = "ts jsx";
      else if (lowerName.endsWith(".ts")) dialect = "ts";
      else if (lowerName.endsWith(".jsx")) dialect = "jsx";

      const configuredParser = jsParser.configure({ dialect });
      const trimmed = code.trim();

      const hasModifier =
        /^(private|public|protected|static|async\s+private|async\s+public|async\s+protected)\s/.test(
          trimmed,
        );
      const isMethodShorthand = /^[a-zA-Z_][a-zA-Z0-9_]*\s*\([^]*?\)\s*\{/.test(
        trimmed,
      );
      const isClassContext =
        block &&
        block.type &&
        (block.type.includes("Method") ||
          block.type.includes("Property") ||
          block.type === "constructor");

      const wrapInClass = hasModifier || isMethodShorthand || isClassContext;
      let targetCode = code;
      if (wrapInClass) {
        targetCode = `class _FallbackClassWrapper_ {\n${code}\n}`;
      }

      const tree = configuredParser.parse(targetCode);
      let lines: string[] = [""];
      let currentLine = 0;

      const emitToken = (text: string, classes: string) => {
        const escaped = this.escapeHtml(text);
        lines[currentLine] += classes
          ? `<span class="${classes}">${escaped}</span>`
          : escaped;
      };

      const emitLineBreak = () => {
        lines.push("");
        currentLine++;
      };

      highlightCode(
        targetCode,
        tree,
        classHighlighter,
        emitToken,
        emitLineBreak,
      );

      if (wrapInClass && lines.length > 2) {
        lines = lines.slice(1, -1);
      }

      return lines.join("\n");
    } catch (e) {
      return this.escapeHtml(code);
    }
  }

  private showCodePreviewPopup(
    block: ScopeBlock,
    fullCode: string,
    scopeSpan: HTMLSpanElement,
    filename: string,
  ) {
    const editor = this.currentEditor;
    if (!editor || !editor.dom) return;

    if (this.activePopupCleanup) {
      this.activePopupCleanup();
    }

    const completeBlockCode = fullCode.slice(block.from, block.to);

    let codeSnippet = completeBlockCode.trim();
    if (codeSnippet.length > 2500) {
      codeSnippet =
        codeSnippet.slice(0, 2500) +
        "\n\n/* ... (Truncated for layout performance) ... */";
    }

    let popupTop = 32;
    if (this.container) {
      popupTop = this.container.getBoundingClientRect().bottom + 4;
    }

    const computedStyle = window.getComputedStyle(editor.dom);
    let editorBg = computedStyle.backgroundColor;
    let editorFg = computedStyle.color;

    if (
      !editorBg ||
      editorBg === "rgba(0, 0, 0, 0)" ||
      editorBg === "transparent"
    ) {
      const scroller = editor.dom.querySelector(".cm-scroller");
      if (scroller) {
        const scrollerStyle = window.getComputedStyle(scroller);
        editorBg = scrollerStyle.backgroundColor;
        editorFg = scrollerStyle.color;
      }
    }

    let acrylicBg = "rgba(30, 30, 30, 0.75)";
    const rgbValues = editorBg.match(/\d+/g);
    if (rgbValues && rgbValues.length >= 3) {
      acrylicBg = `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 0.75)`;
    }

    const popup = document.createElement("div");
    popup.id = "breadcrumbs-preview-popup";
    popup.classList.add("cm-highlighted");

    const defaultStyles = {
      top: `${popupTop}px`,
      left: "5%",
      width: "90%",
      height: "220px",
    };

    popup.style.cssText = `
      position: fixed; top: ${defaultStyles.top}; left: ${defaultStyles.left}; 
      width: ${defaultStyles.width}; height: ${defaultStyles.height};
      background-color: ${acrylicBg}; color: ${editorFg};
      border: 1px solid rgba(128, 128, 128, 0.15); border-radius: 12px;
      box-shadow: 0px 18px 45px rgba(0,0,0,0.4); display: flex; flex-direction: column;
      z-index: 10000; font-size: 11px; font-family: inherit; box-sizing: border-box;
      backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%);
      overflow: hidden; min-width: 200px; min-height: 100px; max-height: 85vh;
    `;

    const styleTag = document.createElement("style");
    const nativeStyleEl = document.getElementById("cm-static-highlight-styles");
    if (
      !nativeStyleEl ||
      !nativeStyleEl.textContent ||
      nativeStyleEl.textContent.trim().length === 0
    ) {
      styleTag.textContent = `
        .cm-highlighted .tok-keyword { color: #c678dd; } .cm-highlighted .tok-operator { color: #56b6c2; }
        .cm-highlighted .tok-number { color: #d19a66; } .cm-highlighted .tok-string { color: #98c379; }
        .cm-highlighted .tok-comment { color: #5c6370; font-style: italic; } .cm-highlighted .tok-variableName { color: #e06c75; }
        .cm-highlighted .tok-propertyName { color: #61afef; } .cm-highlighted .tok-typeName { color: #e5c07b; }
        .cm-highlighted .tok-className { color: #e5c07b; } .cm-highlighted .tok-function { color: #61afef; }
        .cm-highlighted .tok-bool { color: #d19a66; } .cm-highlighted .tok-null { color: #d19a66; }
        .cm-highlighted .tok-punctuation { color: #abb2bf; } .cm-highlighted .tok-heading { color: #e06c75; font-weight: bold; }
      `;
      popup.appendChild(styleTag);
    }

    const titleBar = document.createElement("div");
    titleBar.style.cssText =
      "display: flex; align-items: center; justify-content: flex-start; gap: 14px; padding: 10px 14px; border-bottom: 1px solid rgba(128, 128, 128, 0.15); user-select: none; flex-shrink: 0;";

    const dotContainer = document.createElement("div");
    dotContainer.style.cssText =
      "display: flex; gap: 8px; align-items: center; flex-shrink: 0;";

    const closeDot = document.createElement("span");
    closeDot.style.cssText =
      "width: 13px; height: 13px; background-color: #ff5f56; border-radius: 50%; cursor: pointer; display: inline-block; box-shadow: inset 0 0 1px rgba(0,0,0,0.2);";

    const toggleDot = document.createElement("span");
    toggleDot.style.cssText =
      "width: 13px; height: 13px; background-color: #ffbd2e; border-radius: 50%; cursor: pointer; display: inline-block; box-shadow: inset 0 0 1px rgba(0,0,0,0.2);";

    dotContainer.appendChild(closeDot);
    dotContainer.appendChild(toggleDot);
    titleBar.appendChild(dotContainer);

    const headerLabel = document.createElement("div");
    headerLabel.style.cssText = `
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-size: 11px; opacity: 1; font-weight: bold; color: ${editorFg}; 
      flex: 1; min-width: 0; line-height: 1.35; gap: 1px;
    `;

    const settings: any = acode.require("settings");
    const pluginSettings = settings.value[PLUGIN_ID] || {};
    const showIcons = pluginSettings.showIcons !== false;
    const colorStr = this.getCustomColor(block.type);
    const iconStr = showIcons ? getIconByType(block.type, colorStr) : "";

    headerLabel.innerHTML = `
      <span style="opacity: 0.45; font-size: 9px; font-weight: normal; letter-spacing: 0.3px;">Ln.${block.line}</span>
      <span style="color: ${colorStr}; display: flex; align-items: center; gap: 4px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${iconStr} ${block.name}
      </span>
    `;
    titleBar.appendChild(headerLabel);

    const copyBtn = document.createElement("span");
    copyBtn.id = "breadcrumbs-popup-copy-btn";
    copyBtn.className = "icon copy";
    copyBtn.style.cssText = `
      margin-left: auto; display: inline-flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; border-radius: 6px; cursor: pointer;
      color: ${editorFg}; opacity: 0.55; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      flex-shrink: 0; box-sizing: border-box; font-size: 14px;
    `;

    copyBtn.addEventListener("mouseenter", () => {
      copyBtn.style.opacity = "1";
      copyBtn.style.backgroundColor = "rgba(128, 128, 128, 0.15)";
    });
    copyBtn.addEventListener("mouseleave", () => {
      copyBtn.style.opacity = "0.55";
      copyBtn.style.backgroundColor = "transparent";
    });

    let copyResetTimeout: any = null;
    copyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();

      if (copyResetTimeout) clearTimeout(copyResetTimeout);

      navigator.clipboard
        .writeText(completeBlockCode)
        .then(() => {
          copyBtn.className = "icon check";
          copyBtn.style.opacity = "1";
          copyBtn.style.color = "#4ECC97";

          copyResetTimeout = setTimeout(() => {
            copyBtn.className = "icon copy";
            copyBtn.style.opacity = "0.55";
            copyBtn.style.color = editorFg;
          }, 1800);
        })
        .catch(() => {
          const textarea = document.createElement("textarea");
          textarea.value = completeBlockCode;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand("copy");
            copyBtn.className = "icon check";
            copyBtn.style.opacity = "1";
            copyBtn.style.color = "#4ECC97";
            copyResetTimeout = setTimeout(() => {
              copyBtn.className = "icon copy";
              copyBtn.style.opacity = "0.55";
              copyBtn.style.color = editorFg;
            }, 1800);
          } catch (err) {}
          document.body.removeChild(textarea);
        });
    });

    titleBar.appendChild(copyBtn);
    popup.appendChild(titleBar);

    const contentRegion = document.createElement("div");
    contentRegion.style.cssText =
      "flex: 1; overflow: auto; padding: 12px; line-height: 1.45; font-size:12px;";

    const codeTag = document.createElement("code");
    codeTag.style.cssText = "display: block; white-space: pre;";
    codeTag.innerHTML = this.highlightCodeSnippet(codeSnippet, filename, block);
    contentRegion.appendChild(codeTag);
    popup.appendChild(contentRegion);

    const resizeHandle = document.createElement("div");
    resizeHandle.style.cssText =
      "position: absolute; right: 0; bottom: 0; width: 18px; height: 18px; cursor: se-resize; background: linear-gradient(135deg, transparent 40%, rgba(128,128,128,0.4) 100%); border-bottom-right-radius: 12px; z-index: 10005;";
    popup.appendChild(resizeHandle);

    let startTouchX = 0,
      startTouchY = 0,
      startWidth = 0,
      startHeight = 0;
    const onTouchStartResize = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      e.stopPropagation();
      e.preventDefault();
      startTouchX = e.touches[0].clientX;
      startTouchY = e.touches[0].clientY;
      startWidth = popup.getBoundingClientRect().width;
      startHeight = popup.getBoundingClientRect().height;
      document.addEventListener("touchmove", onTouchMoveResize, {
        passive: false,
      });
      document.addEventListener("touchend", onTouchEndResize);
    };

    const onTouchMoveResize = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      if (isMaximized) return;
      const deltaX = e.touches[0].clientX - startTouchX;
      const deltaY = e.touches[0].clientY - startTouchY;
      popup.style.width = `${Math.max(200, startWidth + deltaX)}px`;
      popup.style.height = `${Math.max(100, startHeight + deltaY)}px`;
    };

    const onTouchMoveResize_1 = onTouchMoveResize;
    const onTouchEndResize = () => {
      document.removeEventListener("touchmove", onTouchMoveResize_1);
      document.removeEventListener("touchend", onTouchEndResize);
    };
    resizeHandle.addEventListener("touchstart", onTouchStartResize, {
      passive: false,
    });

    document.body.appendChild(popup);

    let isMaximized = false;
    let preNavStyles = { width: "", height: "", top: "", left: "" };

    const dismissPopup = () => {
      if (copyResetTimeout) clearTimeout(copyResetTimeout);
      popup.remove();
      scopeSpan.style.textDecoration = "none";
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("mousedown", handleOutsideClick);
      resizeHandle.removeEventListener("touchstart", onTouchStartResize);

      // Explicitly detach global touchmove/touchend when dismissing
      // Prevents leaked listeners on 'document' if popup is closed during an active resize gesture
      document.removeEventListener("touchmove", onTouchMoveResize_1);
      document.removeEventListener("touchend", onTouchEndResize);

      this.activePopupCleanup = null;
    };

    this.activePopupCleanup = dismissPopup;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const targetNode = e.target as Node;
      if (!popup.contains(targetNode) && !scopeSpan.contains(targetNode)) {
        dismissPopup();
      }
    };

    closeDot.addEventListener("click", (e) => {
      e.stopPropagation();
      dismissPopup();
    });

    toggleDot.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!isMaximized) {
        preNavStyles = {
          width: popup.style.width || defaultStyles.width,
          height: popup.style.height || defaultStyles.height,
          top: popup.style.top || defaultStyles.top,
          left: popup.style.left || defaultStyles.left,
        };
        popup.style.top = "40px";
        popup.style.left = "2px";
        popup.style.width = "99%";
        popup.style.height = "80vh";
        isMaximized = true;
      } else {
        popup.style.top = preNavStyles.top;
        popup.style.left = preNavStyles.left;
        popup.style.width = preNavStyles.width;
        popup.style.height = preNavStyles.height;
        isMaximized = false;
      }
    });

    setTimeout(() => {
      document.addEventListener("touchstart", handleOutsideClick);
      document.addEventListener("mousedown", handleOutsideClick);
    }, 150);
  }

  public updateBreadcrumbs(editor: EditorView): void {
    const containerEl = this.container;
    const pathEl = this.pathContainer;
    if (!containerEl || !pathEl || !editor || !editor.state) return;

    let currentFile = editorManager.activeFile;
    let filename = currentFile ? currentFile.filename.toLowerCase() : "";
    if (!/\.(js|jsx|ts|tsx)$/.test(filename)) {
      containerEl.style.display = "none";
      return;
    } else {
      containerEl.style.display = "flex";
    }

    if (currentFile) {
      if (this.prefixTextEl) {
        this.prefixTextEl.textContent = currentFile.filename;
      }
      if (this.prefixIconContainer) {
        const fileExtension = currentFile.filename.split(".").pop() || "";
        this.prefixIconContainer.innerHTML = getFileIconByType(fileExtension);
      }
    }

    if (!containerEl.parentElement && editor.dom) {
      editor.dom.prepend(containerEl);
    }

    const state = editor.state;
    const pos = state.selection.main.head;
    const fullCode = state.doc.toString();

    // High-Efficiency Early Return
    // Instantly aborts heavy processing if neither document content nor cursor offset shifted,
    // avoiding unnecessary `ensureSyntaxTree` or manual parsing on every debounce tick.
    if (fullCode === this.lastDocString && pos === this.lastPos) {
      return;
    }

    // Reflection-based native Tree extraction (or manual fallback)
    const nativeTree = this.getNativeTree(state);
    let finalTree = nativeTree;

    // Safety net: Use ensureSyntaxTree to force a parse if native tree is empty (length: 0)
    if (!finalTree || finalTree.length === 0) {
      // Dialect logic kept here to construct temporary config if fallback is needed
      let dialect = "";
      if (filename.endsWith(".tsx")) dialect = "ts jsx";
      else if (filename.endsWith(".ts")) dialect = "ts";
      else if (filename.endsWith(".jsx")) dialect = "jsx";

      // If reflection failed, try forcing a parse using ensureSyntaxTree
      // This bridges the GAP safely without the Instance Hazard on standard CM6 syntax extensions.
      const fallbackTree = ensureSyntaxTree(state, state.doc.length, 3000);

      if (fallbackTree) {
        finalTree = fallbackTree;
      } else {
        // Ultimate fallback: Manual parsing in plugin's instance (heavier)
        const configuredParser = jsParser.configure({ dialect });
        finalTree = configuredParser.parse(fullCode);
      }
    }

    // Call optimized lezerParser signature
    let validScopes = resolveBreadcrumbs(finalTree, fullCode, pos);

    // Filters scopes based on User Config Switches
    const settings: any = acode.require("settings");
    const pluginSettings = settings.value[PLUGIN_ID] || {};

    validScopes = validScopes.filter((block) => {
      if (
        block.type === "conditional" &&
        pluginSettings.renderConditional === false
      )
        return false;
      if (block.type === "looping" && pluginSettings.renderLooping === false)
        return false;
      if (block.type === "tcf" && pluginSettings.renderTcf === false)
        return false;
      return true;
    });

    let currentFingerprint = "";
    for (let i = 0; i < validScopes.length; i++) {
      currentFingerprint += `${validScopes[i].type}-${validScopes[i].from}-${validScopes[i].to}|`;
    }

    if (
      fullCode === this.lastDocString &&
      currentFingerprint === this.lastScopesFingerprint
    ) {
      this.lastPos = pos;
      return;
    }
    this.lastDocString = fullCode;
    this.lastPos = pos;
    this.lastScopesFingerprint = currentFingerprint;

    while (pathEl.firstChild) {
      pathEl.removeChild(pathEl.firstChild);
    }

    const showIcons = pluginSettings.showIcons !== false;

    if (validScopes.length === 0) {
      const globalSpan = document.createElement("span");
      globalSpan.style.cssText =
        "display: inline-flex; align-items: center; color: var(--text-color, var(--primary-text-color, #ffffff)); pointer-events: none;";
      globalSpan.innerHTML = "...";
      pathEl.appendChild(globalSpan);
    } else {
      const fragment = document.createDocumentFragment();
      const separatorBlueprint = document.createElement("span");
      separatorBlueprint.style.cssText =
        "display: inline-flex; align-items: center; color: var(--text-color, var(--primary-text-color, #ffffff)); opacity: 0.7; flex-shrink: 0;";
      separatorBlueprint.innerHTML = `<i style="font-size: 15px; display: inline-block; vertical-align: middle;" class="icon keyboard_arrow_right"></i>`;

      validScopes.forEach((block: ScopeBlock, index: number) => {
        const scopeSpan = document.createElement("span");
        scopeSpan.setAttribute("data-position", `${block.from}`);
        scopeSpan.style.cssText =
          "display: inline-flex; align-items: center; gap: 2px; cursor: pointer; user-select: none; -webkit-user-select: none;";

        const customColor = this.getCustomColor(block.type);
        const iconHtml = showIcons
          ? getIconByType(block.type, customColor)
          : "";
        const isLast = index === validScopes.length - 1;

        scopeSpan.innerHTML = `${iconHtml}<span style="color: ${customColor}; font-weight: ${isLast ? "bold" : "normal"};">${block.name}</span>`;

        scopeSpan.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.blockClickBypass) return;

          if (editor && typeof editor.dispatch === "function") {
            editor.dispatch({
              selection: { anchor: block.from, head: block.from },
              scrollIntoView: true,
            });
            editor.focus();
          }
        });

        scopeSpan.addEventListener("touchstart", (e) => {
          this.blockClickBypass = false;
          if (this.pressTimer) clearTimeout(this.pressTimer);

          const currentSettings = settings.value[PLUGIN_ID] || {};
          if (currentSettings.disablePreviewPopup) return;

          const configuredDelay = parseInt(
            currentSettings.previewDelay || "480",
            10,
          );

          this.pressTimer = setTimeout(() => {
            this.blockClickBypass = true;
            scopeSpan.style.textDecoration = `underline ${customColor}`;
            this.showCodePreviewPopup(block, fullCode, scopeSpan, filename);
          }, configuredDelay);
        });

        scopeSpan.addEventListener("touchend", () => {
          if (this.pressTimer) clearTimeout(this.pressTimer);
          setTimeout(() => {
            this.blockClickBypass = false;
          }, 100);
        });

        scopeSpan.addEventListener("touchmove", () => {
          if (this.pressTimer) clearTimeout(this.pressTimer);
        });

        fragment.appendChild(scopeSpan);
        if (index < validScopes.length - 1) {
          fragment.appendChild(separatorBlueprint.cloneNode(true));
        }
      });

      pathEl.appendChild(fragment);
    }

    containerEl.scrollLeft = containerEl.scrollWidth;
  }

  public async destroy(): Promise<void> {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
    if (this.pressTimer) clearTimeout(this.pressTimer);

    if (this.activePopupCleanup) {
      this.activePopupCleanup();
    }

    if (this.onFontChangeHandler) {
      const settings: any = acode.require("settings");
      settings.off("update:appFont", this.onFontChangeHandler);
    }

    document.removeEventListener(
      "selectionchange",
      this.onGlobalSelectionChange,
    );

    if (this.currentEditor && this.currentEditor.dom) {
      this.currentEditor.dom.removeEventListener(
        "focusin",
        this.onEditorUpdate,
      );
      this.currentEditor.dom.removeEventListener("click", this.onEditorUpdate);
    }

    if (editorManager && editorManager.off) {
      editorManager.off("switch-file", this.onFileSwitched);
    }

    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.pathContainer = null;
    this.prefixTextEl = null;
    this.prefixIconContainer = null;
    this.currentEditor = null;
    this.lastDocString = "";
    this.lastPos = -1;
    this.lastScopesFingerprint = "";
  }
}

// Full 15 Node Types Prompt UI Mapping Configuration
const breadcrumbsSettings = {
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
        key: "renderConditional",
        text: "Render Conditional Blocks",
        info: "Show conditionals (if, else if, else, switch) in the breadcrumbs trail.",
        checkbox: pluginState.renderConditional !== false,
      },
      {
        key: "renderLooping",
        text: "Render Looping Blocks",
        info: "Show structural loops (for, for-in, for-of, while, do) in the breadcrumbs trail.",
        checkbox: pluginState.renderLooping !== false,
      },
      {
        key: "renderTcf",
        text: "Render Try-Catch Blocks",
        info: "Show error handling constructs (try, catch, finally) in the breadcrumbs trail.",
        checkbox: pluginState.renderTcf !== false,
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

    myBreadcrumbs.clearCache();
    if (editorManager && editorManager.editor) {
      myBreadcrumbs.updateBreadcrumbs(editorManager.editor);
    }
  },
};

const myBreadcrumbs = new BreadcrumbsPlugin();

acode.setPluginInit(
  PLUGIN_ID,
  async (baseUrl: string, $page: any, cache: any) => {
    await myBreadcrumbs.init(baseUrl, $page, cache);
  },
  breadcrumbsSettings,
);

acode.setPluginUnmount(PLUGIN_ID, () => {
  myBreadcrumbs.destroy();
});

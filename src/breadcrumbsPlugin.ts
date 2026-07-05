import type { EditorView } from "@codemirror/view";
import { parser as jsParser } from "@lezer/javascript";
import { PLUGIN_ID } from "./configs/constant";
import { resolveBreadcrumbs, ScopeBlock } from "./utils/lezerParser";
import { getIconByType, getFileIconByType } from "./utils/patterns";
import { getCustomColor } from "./utils/colorResolver";
import { showCodePreviewPopup } from "./popups/codePreviewPopup";

// 💡 Acode core ထဲတွင် ပါဝင်ပြီးသား တူညီသော instance များကို ခေါ်ယူအသုံးပြုခြင်း (Bundle Hazard Fix)
const cmLanguage = acode.require("@codemirror/language");
const syntaxTree = cmLanguage.syntaxTree;
const ensureSyntaxTree = cmLanguage.ensureSyntaxTree;

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
        renderListener: false,
        previewDelay: "480",
        pollingDebounceTimeout: "150",
        colorConditional: "#d68600",
        colorLooping: "#52ff72",
        colorTcf: "#fa3b49",
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
        colorListener: "#fa3b81",
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
      if (state.renderListener === undefined) state.renderListener = true;
      if (state.pollingDebounceTimeout === undefined)
        state.pollingDebounceTimeout = "150";
      if (state.colorConditional === undefined)
        state.colorConditional = "#f59e0b";
      if (state.colorLooping === undefined) state.colorLooping = "#3b82f6";
      if (state.colorTcf === undefined) state.colorTcf = "#a855f7";
      if (state.colorListener === undefined) state.colorListener = "#fa3b81";
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

  // Closes any currently-open preview popup, then delegates the actual DOM
  // building to the popups/codePreviewPopup module. The plugin only keeps
  // ownership of "which cleanup fn is currently active".
  private openCodePreviewPopup(
    block: ScopeBlock,
    fullCode: string,
    scopeSpan: HTMLSpanElement,
    filename: string,
  ) {
    if (this.activePopupCleanup) {
      this.activePopupCleanup();
      this.activePopupCleanup = null;
    }

    showCodePreviewPopup({
      block,
      fullCode,
      scopeSpan,
      filename,
      editor: this.currentEditor,
      container: this.container,
      registerCleanup: (cleanup) => {
        this.activePopupCleanup = cleanup;
      },
    });
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

        const customColor = getCustomColor(block.type);
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
            this.openCodePreviewPopup(block, fullCode, scopeSpan, filename);
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

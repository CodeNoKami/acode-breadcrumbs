import type { EditorView } from "@codemirror/view";
import { parser as jsParser } from "@lezer/javascript";
import { PLUGIN_ID } from "./configs/constant";
import { resolveBreadcrumbs, ScopeBlock } from "./utils/lezerParser";
import { getIconByType, getFileIconByType } from "./utils/patterns";
import { getCustomColor } from "./utils/colorResolver";
import { showCodePreviewPopup } from "./popups/codePreviewPopup";

// Core instances bundled within the Acode context — using acode.require handles
// the platform's dependency bundle mapping hazards securely.
const cmLanguage = acode.require("@codemirror/language");
const syntaxTree = cmLanguage.syntaxTree;
const ensureSyntaxTree = cmLanguage.ensureSyntaxTree;

/**
 * Core orchestrator class for the Breadcrumbs UI components.
 * Tracks Editor view states, schedules layout calculations via debounced listeners,
 * handles lifecycle events, and dynamically mutates CodeMirror trees to resolve structural hierarchy.
 */
export class BreadcrumbsPlugin {
  /** Root UI toolbar panel tracking parent DOM insertion. */
  private container: HTMLDivElement | null = null;
  /** Active inner text node host handling breadcrumbs segment rendering cascades. */
  private pathContainer: HTMLSpanElement | null = null;
  /** Text tracking component tracking active filename configurations. */
  private prefixTextEl: HTMLSpanElement | null = null;
  /** Inner element injection framework allocating file extension vector icons. */
  private prefixIconContainer: HTMLSpanElement | null = null;
  /** Polling loop reference handling late-initialization safety fallbacks during app boot. */
  private intervalId: any = null;
  /** Debounce process timeout tracker managing AST re-indexing and calculation frequencies. */
  private debounceTimeout: any = null;
  /** Context long-press tracker managing execution triggers for preview popup menus. */
  private pressTimer: any = null;
  /** Event wrapper mapping updates dispatched when the user shifts application typography configurations. */
  private onFontChangeHandler: ((newAppFont: string) => void) | null = null;
  /** Reference mapping the currently prioritized CodeMirror 6 active Editor wrapper viewport. */
  private currentEditor: EditorView | null = null;

  // --- Optimization State Caches ---
  /** Cache holding previous document text sequence to prevent processing identical buffers. */
  private lastDocString: string = "";
  /** Tracking register monitoring head cursor indices for delta validation across update loops. */
  private lastPos: number = -1;
  /** Signature string identifying structure rendering shifts to eliminate unneeded DOM structural redraws. */
  private lastScopesFingerprint: string = "";
  /** Destructuring cleanup callback reference handling active UI window disposal mechanics. */
  private activePopupCleanup: (() => void) | null = null;
  /** Internal switch tracking drag and long-press interactions to block accidental trigger conflicts. */
  private blockClickBypass: boolean = false;

  /**
   * Clears internal parsing evaluation cache pools.
   * Dispatched during preference re-routing cycles to enforce instant UI styling updates.
   */
  public clearCache(): void {
    this.lastDocString = "";
    this.lastPos = -1;
    this.lastScopesFingerprint = "";
  }

  /**
   * Reflection-based parsing framework that extracts standard Lezer trees across CodeMirror objects.
   * Resolves the "Lezer Instance Hazard" in nested extension bundles by validating target prototype shape layouts.
   *
   * @param state - The active target CodeMirror EditorState context.
   * @returns A valid native Lezer Tree reference structure, or null if reflection routes remain unresolved.
   * @private
   */
  private getNativeTree(state: any): any {
    if (!state) return null;
    try {
      // Loop across state object keys to detect dynamic minified storage slots holding LanguageState
      for (const key of Object.keys(state)) {
        const val = state[key];
        if (Array.isArray(val)) {
          for (const item of val) {
            // Identify target structure signatures carrying internal Lezer Tree properties
            if (item && item.tree && typeof item.tree === "object") {
              const t = item.tree;
              // Perform structure verification tests to certify object layout compatibility
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

  /**
   * Initializes fundamental plug-in states, maps configuration registries, and sets up initialization intervals.
   *
   * @param baseUrl - Root asset endpoint route.
   * @param $page - Host platform page layer window binding mapping.
   * @param cache - Cached state preservation context mapping profiles.
   */
  public async init(baseUrl: string, $page: any, cache: any): Promise<void> {
    const _ = { baseUrl, $page, cache };

    // Clear legacy timers to eliminate leakage vulnerabilities during reloads
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Set default values securely if setting registration profiles are absent
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
      // Configuration fallback validation routine managing seamless application version upgrades
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

    // Schedule canvas verification loops to coordinate mounting mechanics with Acode editor core structures
    this.intervalId = setInterval(() => {
      const editor = editorManager.editor;
      if (editor && editor.dom) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.setupBreadcrumbs(editor);
      }
    }, 200);
  }

  /**
   * Generates structural DOM layout shells and wires up event listeners onto target Editor viewports.
   *
   * @param editor - The destination CodeMirror View targeting viewport initialization.
   * @private
   */
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

  /**
   * Document tab-switch callback. Handles teardown logic for old context maps,
   * shifts viewport ownership references, and reparents DOM structural frames smoothly.
   *
   * @private
   */
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

  /**
   * Binds selection and viewport focus change listener callbacks to synchronize breadcrumbs changes.
   *
   * @param editor - Active host framework view mapping container context.
   * @private
   */
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

  /**
   * Schedules a throttled validation pass on structural updates.
   * Prevents system overhead from rapid keyboard inputs by pacing parsing requests.
   *
   * @param editor - Target validation viewport view.
   * @private
   */
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

  /** Global tracker callback routing cursor position adjustments. */
  private onGlobalSelectionChange = () => {
    if (this.currentEditor) this.queueUpdate(this.currentEditor);
  };

  /** Internal feedback tracking update routing logic mapping interactive focus events. */
  private onEditorUpdate = () => {
    if (this.currentEditor) this.queueUpdate(this.currentEditor);
  };

  /**
   * Manages cleanup workflows for active popup panels, then shifts DOM assembly assignments
   * downstream to the external CodePreviewPopup module.
   *
   * @param block - Abstract configuration state slice matching selection properties.
   * @param fullCode - Raw document text string data block.
   * @param scopeSpan - Source target element frame tracking structural target alignment vectors.
   * @param filename - Identification name token string for targeted active tab maps.
   * @private
   */
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

  /**
   * Primary execution loop. Extracts abstract syntax mappings from structural states,
   * enforces custom user filtering preferences, and reconstructs the HTML breadcrumbs trail.
   *
   * @param editor - Target context view framework processing state updates.
   */
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

    // High-Efficiency Early Return Strategy:
    // Aborts processing instantly if neither the document structure nor cursor offset changes,
    // protecting memory profiles from unnecessary syntax recalculations on idle frames.
    if (fullCode === this.lastDocString && pos === this.lastPos) {
      return;
    }

    // Attempt reflection extraction of the active Lezer Tree
    const nativeTree = this.getNativeTree(state);
    let finalTree = nativeTree;

    // Incremental Parsing Fallback Strategy:
    // Invoked if the internal cache returns empty to rebuild missing AST nodes safely.
    if (!finalTree || finalTree.length === 0) {
      let dialect = "";
      if (filename.endsWith(".tsx")) dialect = "ts jsx";
      else if (filename.endsWith(".ts")) dialect = "ts";
      else if (filename.endsWith(".jsx")) dialect = "jsx";

      // Re-evaluate through ensureSyntaxTree to complete missing nodes up to the current buffer length
      const fallbackTree = ensureSyntaxTree(state, state.doc.length, 3000);

      if (fallbackTree) {
        finalTree = fallbackTree;
      } else {
        // Complete structural rebuilding fallback path for untyped or missing context states
        const configuredParser = jsParser.configure({ dialect });
        finalTree = configuredParser.parse(fullCode);
      }
    }

    // Traverse the Lezer AST structure to map hierarchical node chains
    let validScopes = resolveBreadcrumbs(finalTree, fullCode, pos);

    // Apply configuration visibility filters to current tokens
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

    // Compile an identity fingerprint to detect scope structure changes
    let currentFingerprint = "";
    for (let i = 0; i < validScopes.length; i++) {
      currentFingerprint += `${validScopes[i].type}-${validScopes[i].from}-${validScopes[i].to}|`;
    }

    // Skip DOM updates if layout states match previous tree shapes
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

    // Flush old UI items safely
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
      // Build layouts via standard Document Fragments to optimize repaint sequences
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

        // Direct Jumps: Shift text cursor directly to targeted scope locations upon tap interactions
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

        // Setup touch-hold listener cards to manage structural code previews
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

    // Auto scroll view panel frames to trace long structural scope chains
    containerEl.scrollLeft = containerEl.scrollWidth;
  }

  /**
   * Plugin disposal method. Tears down UI elements, unbinds hardware touch timers,
   * flushes garbage collections safely, and drops active platform runtime hooks.
   *
   * @returns Resolves asynchronously when demolition procedures complete.
   */
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

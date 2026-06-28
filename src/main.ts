import { PLUGIN_ID } from "./configs/constant";
import { EditorView } from "@codemirror/view";
import { parser as jsParser } from "@lezer/javascript";
import { highlightTree, classHighlighter } from "@lezer/highlight"; // Official CodeMirror Highlighting Engine
import { resolveBreadcrumbs, ScopeBlock } from "./utils/lezerParser";
import { getIconByType, getColorByType } from "./utils/patterns";

// External Acode environment global variables declaration
declare var editorManager: any;
declare var acode: any;

/**
 * Core plugin class responsible for managing the lifecycle, DOM rendering,
 * and event synchronization of the VS Code-style Breadcrumbs navigation bar.
 */
class BreadcrumbsPlugin {
  private container: HTMLDivElement | null = null;
  private pathContainer: HTMLSpanElement | null = null; // High-performance dynamic rendering sub-target
  private intervalId: any = null;
  private debounceTimeout: any = null;
  private pressTimer: any = null; // Direct tracking reference for long-press calculations
  private onFontChangeHandler: ((newAppFont: string) => void) | null = null;
  private currentEditor: EditorView | null = null;

  /**
   * Initializes the plugin, tracking editor availability with a short interval check.
   */
  public async init(baseUrl: string, $page: any, cache: any): Promise<void> {
    const _ = { baseUrl, $page, cache };

    // Poll until the current active editor DOM context becomes fully available
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
   * Creates the breadcrumbs container element, configures native theme styles,
   * attaches font monitoring settings, and injects listeners into the active editor instance.
   */
  private setupBreadcrumbs(editor: EditorView) {
    if (this.container) this.container.remove();
    this.currentEditor = editor;

    const settings: any = acode.require("settings");
    let appFont: string = settings.get("appFont") || "monospace";

    // Build standalone HTML container bar for tracking scopes
    this.container = document.createElement("div");
    this.container.id = "acode-breadcrumbs-bar";

    // Premium desktop-grade visual layout configuration mapping native material css variables
    this.container.style.cssText = `
      display: flex; align-items: center; gap: 6px; padding: 6px 25px 6px 12px;
      background-color: var(--primary-color, #1e1e1e); 
      color: var(--text-color, var(--primary-text-color, #ffffff));
      font-family: ${appFont}, monospace; font-size: 11px; box-shadow: 0 2px 4px var(--box-shadow-color, rgba(0,0,0,0.2));
      overflow-x: auto; overflow-y: hidden; white-space: nowrap; box-sizing: border-box;
      z-index: 10; height: 28px;
    `;

    // 1. STATIC HEADER OPTIMIZATION: Build fixed layout structures once to avoid main-thread thrashing
    const prefix = document.createElement("span");
    prefix.style.cssText =
      "display: inline-flex; align-items: center; color: var(--text-color, var(--primary-text-color, #ffffff)); flex-shrink: 0;";
    const breadcrumbsIconHtml = `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: none; stroke: var(--text-color, var(--primary-text-color, #ffffff)); stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; vertical-align: middle; margin-right: 5px;"><path d="M2 4h5v4H2zM9 4h5v2H9zm0 6h5v2H9zm-7 2h5v2H2z"/><path d="M4.5 8v4M11.5 6v4"/></svg>`;
    prefix.innerHTML = `${breadcrumbsIconHtml}Breadcrumbs`;
    this.container.appendChild(prefix);

    const baseSeparator = document.createElement("span");
    baseSeparator.style.cssText =
      "display: inline-flex; align-items: center; color: var(--text-color, var(--primary-text-color, #ffffff)); opacity: 0.7; flex-shrink: 0;";
    baseSeparator.innerHTML = `<i style="font-size: 15px; display: inline-block; vertical-align: middle;" class="icon keyboard_arrow_right"></i>`;
    this.container.appendChild(baseSeparator);

    // Dynamic inner wrapper housing shifting code block fragments exclusively
    this.pathContainer = document.createElement("span");
    this.pathContainer.style.cssText =
      "display: inline-flex; align-items: center; gap: 6px;";
    this.container.appendChild(this.pathContainer);

    // Real-time observer listener synchronization for application configuration changes
    this.onFontChangeHandler = (newAppFont: string) => {
      if (this.container)
        this.container.style.fontFamily = `${newAppFont}, monospace`;
    };
    settings.on("update:appFont", this.onFontChangeHandler);

    // Prepend container strictly into top viewport structure of current workspace layout
    editor.dom.prepend(this.container);

    // Listen to changes when user targets alternative working document tab active context
    if (editorManager && editorManager.on) {
      editorManager.off("switch-file", this.onFileSwitched); // Clean up stale bounds
      editorManager.on("switch-file", this.onFileSwitched);
    }

    this.injectUpdateListener(editor);
    this.queueUpdate(editor);
  }

  /**
   * Refreshes the structural layout when an alternative working file tab is selected.
   */
  private onFileSwitched = () => {
    const editor = editorManager.editor;
    if (editor && editor.dom) {
      // Safely tear down old regional DOM listeners before migrating focus tracking
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

      this.currentEditor = editor;
      if (this.container) {
        editor.dom.prepend(this.container);
      }
      this.injectUpdateListener(editor);
      this.queueUpdate(editor);
    }
  };

  /**
   * Injects event subscription bindings on both global document selection states
   * and regional core user mouse/keyboard focus activities.
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
   * Coalesces multiple rapid parsing triggers into a single evaluation sequence.
   * Essential for maintaining high typing performance on mobile CPUs.
   */
  private queueUpdate(editor: EditorView) {
    if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(() => {
      this.updateBreadcrumbs(editor);
    }, 45); // Balanced 45ms update window coalesces typing bursts safely
  }

  /**
   * Triggers background scope refresh updates when global text selection states change.
   */
  private onGlobalSelectionChange = () => {
    if (this.currentEditor) {
      this.queueUpdate(this.currentEditor);
    }
  };

  /**
   * Refreshes target active tracking coordinates on immediate cursor interaction events.
   */
  private onEditorUpdate = () => {
    if (this.currentEditor) {
      this.queueUpdate(this.currentEditor);
    }
  };

  /**
   * Safe HTML string encoder to protect DOM injection loops from raw script characters
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /**
   * High-performance token highlighter utilizing the official @lezer/highlight package.
   * Generates token classes dynamically matched to specialized theme styles.
   */
  private highlightCode(code: string): string {
    try {
      const tree = jsParser.parse(code);
      let html = "";
      let lastPos = 0;

      // Leverage official classHighlighter to emit structured CodeMirror-compatible syntax tokens
      highlightTree(tree, classHighlighter, (from, to, classes) => {
        // Append raw unstyled segments (whitespaces, brackets, newlines)
        if (from > lastPos) {
          html += this.escapeHtml(code.slice(lastPos, from));
        }
        // Wrap token segments with Lezer system CSS classes
        html += `<span class="${classes}">${this.escapeHtml(code.slice(from, to))}</span>`;
        lastPos = to;
      });

      if (lastPos < code.length) {
        html += this.escapeHtml(code.slice(lastPos));
      }
      return html;
    } catch (e) {
      return this.escapeHtml(code); // Resilient fallback to raw presentation upon parsing anomalies
    }
  }

  /**
   * Spawns an overlay layout panel containing a high-definition highlighted code preview
   * slice directly beneath the active breadcrumbs workspace tracking bar.
   */
  private showCodePreviewPopup(
    block: ScopeBlock,
    fullCode: string,
    scopeSpan: HTMLSpanElement,
  ) {
    const editor = this.currentEditor;
    if (!editor || !editor.dom) return;

    // Clear any dangling preview artifacts
    const existingPopup = document.getElementById("breadcrumbs-preview-popup");
    if (existingPopup) existingPopup.remove();

    let codeSnippet = fullCode.slice(block.from, block.to).trim();

    // Safety check: Prevent excessive UI paint thrashing on extraordinarily massive objects
    if (codeSnippet.length > 1200) {
      codeSnippet =
        codeSnippet.slice(0, 1200) +
        "\n\n/* ... (Truncated for layout performance) ... */";
    }

    // Dynamic Geometry Calculation: Position overlay layout 4px strictly under the Breadcrumbs boundary
    let popupTop = 32;
    if (this.container) {
      const rect = this.container.getBoundingClientRect();
      popupTop = rect.bottom + 4;
    }

    // Extract exact background styles to blend container box seamlessly
    const editorDom = editor.dom;
    const computedStyle = window.getComputedStyle(editorDom);
    let editorBg = computedStyle.backgroundColor;
    let editorFg = computedStyle.color;

    if (
      !editorBg ||
      editorBg === "rgba(0, 0, 0, 0)" ||
      editorBg === "transparent"
    ) {
      const scroller = editorDom.querySelector(".cm-scroller");
      if (scroller) {
        const scrollerStyle = window.getComputedStyle(scroller);
        editorBg = scrollerStyle.backgroundColor;
        editorFg = scrollerStyle.color;
      }
    }

    // --- High-Performance Dark/Light Adaptive Engine ---
    // Parse RGB to calculate precise luminance factor
    let isDark = true;
    const rgbValues = editorBg.match(/\d+/g);
    if (rgbValues && rgbValues.length >= 3) {
      const r = parseInt(rgbValues[0]),
        g = parseInt(rgbValues[1]),
        b = parseInt(rgbValues[2]);
      const luminance = (r * 299 + g * 587 + b * 114) / 1000;
      isDark = luminance < 135; // True if background matches dark constraints
    }

    const popup = document.createElement("div");
    popup.id = "breadcrumbs-preview-popup";

    popup.style.cssText = `
      position: fixed; top: ${popupTop}px; left: 5%; width: 90%; max-height: 220px;
      background-color: ${editorBg}; color: ${editorFg};
      border: 1px solid rgba(128, 128, 128, 0.25); border-radius: 8px;
      box-shadow: 0px 14px 35px rgba(0,0,0,0.4); padding: 12px; overflow: auto;
      z-index: 10000; font-size: 11px; white-space: pre; font-family: inherit;
      box-sizing: border-box; line-height: 1.45; pointer-events: none;
    `;

    // Inject Rock-Solid Bulletproof Style Tags explicitly mapping Lezer tokens
    const styleTag = document.createElement("style");
    if (isDark) {
      // Premium Matte Dark Palette (One-Dark / Dracula Hybrid)
      styleTag.textContent = `
        #breadcrumbs-preview-popup .tok-keyword { color: #ff79c6; font-weight: bold; }
        #breadcrumbs-preview-popup .tok-string { color: #98c379; }
        #breadcrumbs-preview-popup .tok-number { color: #d19a66; }
        #breadcrumbs-preview-popup .tok-comment { color: #7f848e; font-style: italic; }
        #breadcrumbs-preview-popup .tok-variableName { color: #abb2bf; }
        #breadcrumbs-preview-popup .tok-propertyName { color: #61afef; }
        #breadcrumbs-preview-popup .tok-definition { color: #e5c07b; }
        #breadcrumbs-preview-popup .tok-operator { color: #56b6c2; }
        #breadcrumbs-preview-popup .tok-punctuation { color: #abb2bf; opacity: 0.8; }
        #breadcrumbs-preview-popup .tok-meta { color: #d19a66; }
      `;
    } else {
      // Premium Professional Light Palette (GitHub Light Inspired)
      styleTag.textContent = `
        #breadcrumbs-preview-popup .tok-keyword { color: #d73a49; font-weight: bold; }
        #breadcrumbs-preview-popup .tok-string { color: #032f62; }
        #breadcrumbs-preview-popup .tok-number { color: #005cc5; }
        #breadcrumbs-preview-popup .tok-comment { color: #6a737d; font-style: italic; }
        #breadcrumbs-preview-popup .tok-variableName { color: #24292e; }
        #breadcrumbs-preview-popup .tok-propertyName { color: #6f42c1; }
        #breadcrumbs-preview-popup .tok-definition { color: #e36209; }
        #breadcrumbs-preview-popup .tok-operator { color: #d73a49; }
        #breadcrumbs-preview-popup .tok-punctuation { color: #24292e; opacity: 0.7; }
        #breadcrumbs-preview-popup .tok-meta { color: #e36209; }
      `;
    }
    popup.appendChild(styleTag);

    // Dynamic descriptor header item detailing source line metadata location tracking
    const headerLabel = document.createElement("div");
    headerLabel.style.cssText = `
      font-size: 10px; text-transform: uppercase; opacity: 0.55; margin-bottom: 8px;
      border-bottom: 1px solid rgba(128, 128, 128, 0.2); padding-bottom: 4px; font-weight: bold;
      color: ${editorFg};
    `;
    headerLabel.textContent = `Preview: ${block.type} "${block.name}" (Line ${block.line})`;
    popup.appendChild(headerLabel);

    const codeTag = document.createElement("code");
    // Inject parsed syntax matrix markup safely
    codeTag.innerHTML = this.highlightCode(codeSnippet);
    popup.appendChild(codeTag);

    document.body.appendChild(popup);

    // Click backdrop listener to dismiss the overlay layer instantly
    const dismissPopup = () => {
      popup.remove();
      scopeSpan.style.textDecoration = "none"; // Safely clears the custom typed underline feedback
      document.removeEventListener("touchstart", dismissPopup);
      document.removeEventListener("mousedown", dismissPopup);
    };

    // Minor execution timeout gap allows hardware layer locks to initialize before listening
    setTimeout(() => {
      document.addEventListener("touchstart", dismissPopup);
      document.addEventListener("mousedown", dismissPopup);
    }, 150);
  }

  /**
   * Evaluates active node parsing trees and updates the DOM representation within the bar view.
   */
  public updateBreadcrumbs(editor: EditorView): void {
    const containerEl = this.container;
    const pathEl = this.pathContainer;
    if (!containerEl || !pathEl || !editor || !editor.state) return;

    let currentFile = editorManager.activeFile;
    let filename = currentFile ? currentFile.filename.toLowerCase() : "";

    // Safety check filter criteria restricting parsing workloads strictly to valid AST files
    const isSupportedFile = /\.(js|jsx|ts|tsx)$/.test(filename);

    if (!isSupportedFile) {
      containerEl.style.display = "none";
      return;
    } else {
      containerEl.style.display = "flex";
    }

    // Recover layout structure position if container element gets unmounted implicitly
    if (!containerEl.parentElement && editor.dom) {
      editor.dom.prepend(containerEl);
    }

    // Capture precise coordinates of active text range markers inside CodeMirror document
    const state = editor.state;
    const pos = state.selection.main.head;
    const fullCode = state.doc.toString();

    // Call standalone AST lookup core engine to gather active structural scopes
    const validScopes = resolveBreadcrumbs(fullCode, pos);

    // 2. HIGH PERFORMANCE DOM REFRESH: Only sweep away the dynamic path children
    while (pathEl.firstChild) {
      pathEl.removeChild(pathEl.firstChild);
    }

    // Handle root execution block context mappings when node arrays return empty
    if (validScopes.length === 0) {
      const globalSpan = document.createElement("span");
      globalSpan.style.cssText =
        "display: inline-flex; align-items: center; color: var(--text-color, var(--primary-text-color, #ffffff));";

      const globalIconHtml = `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: none; stroke: var(--text-color, var(--primary-text-color, #ffffff)); stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; vertical-align: middle; margin-right: 5px;"><circle cx="8" cy="8" r="7"/><path d="M1 8h14M8 1a12 12 0 0 1 0 14M8 1a12 12 0 0 0 0 14"/></svg>`;
      globalSpan.innerHTML = `${globalIconHtml}Global`;
      pathEl.appendChild(globalSpan);
    } else {
      const fragment = document.createDocumentFragment();

      // Shared separator reference blueprint to clone inside the render sequence
      const separatorBlueprint = document.createElement("span");
      separatorBlueprint.style.cssText =
        "display: inline-flex; align-items: center; color: var(--text-color, var(--primary-text-color, #ffffff)); opacity: 0.7; flex-shrink: 0;";
      separatorBlueprint.innerHTML = `<i style="font-size: 15px; display: inline-block; vertical-align: middle;" class="icon keyboard_arrow_right"></i>`;

      validScopes.forEach((block: ScopeBlock, index: number) => {
        const scopeSpan = document.createElement("span");
        scopeSpan.setAttribute("data-position", `${block.from}`);

        // Make scope elements clickable and prevent unintended highlights on active touch gestures
        scopeSpan.style.cssText =
          "display: inline-flex; align-items: center; gap: 2px; cursor: pointer; user-select: none; -webkit-user-select: none;";

        const iconHtml = getIconByType(block.type);
        const isLast = index === validScopes.length - 1;

        // Apply distinct geometric properties with clear visual priority on deepest scoped targets
        scopeSpan.innerHTML = `${iconHtml}<span style="color: ${getColorByType(block.type)}; font-weight: ${isLast ? "bold" : "normal"};">${block.name}</span>`;

        // Interactive Code Navigation: Handle click events to relocate editor cursor
        scopeSpan.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (editor && typeof editor.dispatch === "function") {
            // Relocate CodeMirror text range selectors to the starting coordinates of target scope
            editor.dispatch({
              selection: { anchor: block.from, head: block.from },
              scrollIntoView: true,
            });
            editor.focus(); // Pull primary hardware keyboard context straight back into views
          }
        });

        // --- Premium Feature Integration: Non-blocking Touch Interaction Loop ---
        scopeSpan.addEventListener("touchstart", (e) => {
          if (this.pressTimer) clearTimeout(this.pressTimer);

          this.pressTimer = setTimeout(() => {
            // Long-press confirmed: Apply dynamic typed underline coloration instantly
            scopeSpan.style.textDecoration = `underline ${getColorByType(block.type)}`;
            this.showCodePreviewPopup(block, fullCode, scopeSpan);
          }, 480);
        });

        // Cancel pending timers instantly if interaction yields context modifications
        scopeSpan.addEventListener("touchend", () => {
          if (this.pressTimer) clearTimeout(this.pressTimer);
        });
        scopeSpan.addEventListener("touchmove", () => {
          if (this.pressTimer) clearTimeout(this.pressTimer);
        });

        fragment.appendChild(scopeSpan);

        // Inject directional chevron separator icons between individual block tracks
        if (index < validScopes.length - 1) {
          fragment.appendChild(separatorBlueprint.cloneNode(true));
        }
      });

      pathEl.appendChild(fragment);
    }

    // Force horizontal scroll states to lock at the tail edge for visibility on long paths
    containerEl.scrollLeft = containerEl.scrollWidth;
  }

  /**
   * Tears down and cleans up registered memory structures, event bindings, and DOM traces
   * upon extension unmount actions.
   */
  public async destroy(): Promise<void> {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
    if (this.pressTimer) clearTimeout(this.pressTimer);

    // Purge active preview artifacts during teardown
    const existingPopup = document.getElementById("breadcrumbs-preview-popup");
    if (existingPopup) existingPopup.remove();

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
    this.currentEditor = null;
  }
}

// Instantiate and bind entry point lifecycle Hooks to target system context definitions
const myBreadcrumbs = new BreadcrumbsPlugin();
acode.setPluginInit(
  PLUGIN_ID,
  async (baseUrl: string, $page: any, cache: any) => {
    await myBreadcrumbs.init(baseUrl, $page, cache);
  },
);
acode.setPluginUnmount(PLUGIN_ID, () => {
  myBreadcrumbs.destroy();
});

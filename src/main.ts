import { PLUGIN_ID } from "./configs/constant";
import { EditorView } from "@codemirror/view";
import { parser as jsParser } from "@lezer/javascript";
import { highlightCode, classHighlighter } from "@lezer/highlight"; // Official Highlighting Engine API
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
  private pathContainer: HTMLSpanElement | null = null;
  private intervalId: any = null;
  private debounceTimeout: any = null;
  private pressTimer: any = null;
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

    // Static Header Optimization: Build fixed layout structures once to avoid main-thread thrashing
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
      editorManager.off("switch-file", this.onFileSwitched);
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
    }, 45);
  }

  private onGlobalSelectionChange = () => {
    if (this.currentEditor) this.queueUpdate(this.currentEditor);
  };

  private onEditorUpdate = () => {
    if (this.currentEditor) this.queueUpdate(this.currentEditor);
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
   * Re-engineered highlighting engine with dynamic Lezer dialect configuration
   * and class wrapper injections to accurately parse standalone methods without syntax errors.
   */
  private highlightCodeSnippet(
    code: string,
    filename: string,
    block?: ScopeBlock,
  ): string {
    try {
      let dialect = "";
      const lowerName = filename.toLowerCase();

      // Configure Lezer dialects dynamically based on active language extensions
      if (lowerName.endsWith(".tsx")) {
        dialect = "ts jsx";
      } else if (lowerName.endsWith(".ts")) {
        dialect = "ts";
      } else if (lowerName.endsWith(".jsx")) {
        dialect = "jsx";
      }

      const configuredParser = jsParser.configure({ dialect });
      const trimmed = code.trim();

      // Smart Scope Analysis: Detect if the code block represents a class member method/property
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

      // Inject dummy class context to bypass top-level parsing constraints and prevent Error nodes
      let targetCode = code;
      if (wrapInClass) {
        targetCode = `class _FallbackClassWrapper_ {\n${code}\n}`;
      }

      const tree = configuredParser.parse(targetCode);
      let lines: string[] = [""];
      let currentLine = 0;

      // Callback invoked for every styled token block to wrap it in a custom class span
      const emitToken = (text: string, classes: string) => {
        const escaped = this.escapeHtml(text);
        if (classes) {
          lines[currentLine] += `<span class="${classes}">${escaped}</span>`;
        } else {
          lines[currentLine] += escaped;
        }
      };

      // Callback invoked whenever a newline character sequence is encountered
      const emitLineBreak = () => {
        lines.push("");
        currentLine++;
      };

      // Execute official Lezer tree traversal token mapping pipeline
      highlightCode(
        targetCode,
        tree,
        classHighlighter,
        emitToken,
        emitLineBreak,
      );

      // Cleanly slice out the inserted dummy wrapper boundaries if wrapped
      if (wrapInClass && lines.length > 2) {
        lines = lines.slice(1, -1);
      }

      return lines.join("\n");
    } catch (e) {
      return this.escapeHtml(code); // Resilient fallback to raw presentation upon parsing anomalies
    }
  }

  /**
   * Spawns an overlay layout panel containing a high-definition highlighted code preview
   * slice featuring an elegant Acrylic frosted glass style backdrop filter.
   */
  private showCodePreviewPopup(
    block: ScopeBlock,
    fullCode: string,
    scopeSpan: HTMLSpanElement,
    filename: string,
  ) {
    const editor = this.currentEditor;
    if (!editor || !editor.dom) return;

    // Clear any dangling preview artifacts
    const existingPopup = document.getElementById("breadcrumbs-preview-popup");
    if (existingPopup) existingPopup.remove();

    let codeSnippet = fullCode.slice(block.from, block.to).trim();

    if (codeSnippet.length > 1200) {
      codeSnippet =
        codeSnippet.slice(0, 1200) +
        "\n\n/* ... (Truncated for layout performance) ... */";
    }

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

    // Parse Theme RGB values to calculate luminance and convert to a semi-transparent Acrylic base
    let isDark = true;
    let acrylicBg = "rgba(30, 30, 30, 0.75)"; // Dark theme default fallback
    const rgbValues = editorBg.match(/\d+/g);

    if (rgbValues && rgbValues.length >= 3) {
      const r = parseInt(rgbValues[0]),
        g = parseInt(rgbValues[1]),
        b = parseInt(rgbValues[2]);
      const luminance = (r * 299 + g * 587 + b * 114) / 1000;
      isDark = luminance < 135;
      // Convert solid color to 75% opacity to let backdrop-filter shine through
      acrylicBg = `rgba(${r}, ${g}, ${b}, 0.75)`;
    } else {
      acrylicBg = isDark
        ? "rgba(30, 30, 30, 0.75)"
        : "rgba(245, 245, 245, 0.75)";
    }

    // Premium fine border lines accentuating the glassomorphism container layer
    const glassBorder = isDark
      ? "1px solid rgba(255, 255, 255, 0.12)"
      : "1px solid rgba(0, 0, 0, 0.08)";

    const popup = document.createElement("div");
    popup.id = "breadcrumbs-preview-popup";

    // Injected with highly-optimized hardware-accelerated Acrylic blur matrices
    popup.style.cssText = `
      position: fixed; top: ${popupTop}px; left: 5%; width: 90%; max-height: 220px;
      background-color: ${acrylicBg}; color: ${editorFg};
      border: ${glassBorder}; border-radius: 12px;
      box-shadow: 0px 16px 40px rgba(0,0,0,0.35); padding: 12px; overflow: auto;
      z-index: 10000; font-size: 11px; white-space: pre; font-family: inherit;
      box-sizing: border-box; line-height: 1.45;
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
    `;

    // Inject premium, high-contrast CSS styling tags explicitly mapping official Lezer token signatures
    const styleTag = document.createElement("style");
    if (isDark) {
      styleTag.textContent = `
        #breadcrumbs-preview-popup .tok-keyword { color: #c678dd; font-weight: bold; }
        #breadcrumbs-preview-popup .tok-string { color: #98c379; }
        #breadcrumbs-preview-popup .tok-number { color: #d19a66; }
        #breadcrumbs-preview-popup .tok-comment { color: #5c6370; font-style: italic; }
        #breadcrumbs-preview-popup .tok-variableName { color: #61afef; }
        #breadcrumbs-preview-popup .tok-propertyName { color: #e06c75; }
        #breadcrumbs-preview-popup .tok-definition { color: #e5c07b; }
        #breadcrumbs-preview-popup .tok-operator { color: #56b6c2; }
        #breadcrumbs-preview-popup .tok-punctuation { color: #abb2bf; opacity: 0.8; }
        #breadcrumbs-preview-popup .tok-meta { color: #d19a66; }
        #breadcrumbs-preview-popup .tok-typeName { color: #e5c07b; }
        #breadcrumbs-preview-popup .tok-tagName { color: #e06c75; font-weight: bold; }
        #breadcrumbs-preview-popup .tok-attributeName { color: #d19a66; }
      `;
    } else {
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
        #breadcrumbs-preview-popup .tok-typeName { color: #005cc5; }
        #breadcrumbs-preview-popup .tok-tagName { color: #22863a; font-weight: bold; }
        #breadcrumbs-preview-popup .tok-attributeName { color: #6f42c1; }
      `;
    }
    popup.appendChild(styleTag);

    const headerLabel = document.createElement("div");
    headerLabel.style.cssText = `
      font-size: 10px; text-transform: uppercase; opacity: 0.55; margin-bottom: 8px;
      border-bottom: 1px solid rgba(128, 128, 128, 0.15); padding-bottom: 4px; font-weight: bold;
      color: ${editorFg};
    `;
    headerLabel.textContent = `Preview: ${block.type} "${block.name}" (Line ${block.line})`;
    popup.appendChild(headerLabel);

    const codeTag = document.createElement("code");
    codeTag.innerHTML = this.highlightCodeSnippet(codeSnippet, filename, block);
    popup.appendChild(codeTag);

    document.body.appendChild(popup);

    const dismissPopup = () => {
      popup.remove();
      scopeSpan.style.textDecoration = "none";
      document.removeEventListener("touchstart", dismissPopup);
      document.removeEventListener("mousedown", dismissPopup);
    };

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
    const isSupportedFile = /\.(js|jsx|ts|tsx)$/.test(filename);

    if (!isSupportedFile) {
      containerEl.style.display = "none";
      return;
    } else {
      containerEl.style.display = "flex";
    }

    if (!containerEl.parentElement && editor.dom) {
      editor.dom.prepend(containerEl);
    }

    const state = editor.state;
    const pos = state.selection.main.head;
    const fullCode = state.doc.toString();
    const validScopes = resolveBreadcrumbs(fullCode, pos);

    while (pathEl.firstChild) {
      pathEl.removeChild(pathEl.firstChild);
    }

    if (validScopes.length === 0) {
      const globalSpan = document.createElement("span");
      globalSpan.style.cssText =
        "display: inline-flex; align-items: center; color: var(--text-color, var(--primary-text-color, #ffffff));";

      const globalIconHtml = `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: none; stroke: var(--text-color, var(--primary-text-color, #ffffff)); stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; vertical-align: middle; margin-right: 5px;"><circle cx="8" cy="8" r="7"/><path d="M1 8h14M8 1a12 12 0 0 1 0 14M8 1a12 12 0 0 0 0 14"/></svg>`;
      globalSpan.innerHTML = `${globalIconHtml}Global`;
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

        const iconHtml = getIconByType(block.type);
        const isLast = index === validScopes.length - 1;

        scopeSpan.innerHTML = `${iconHtml}<span style="color: ${getColorByType(block.type)}; font-weight: ${isLast ? "bold" : "normal"};">${block.name}</span>`;

        scopeSpan.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (editor && typeof editor.dispatch === "function") {
            editor.dispatch({
              selection: { anchor: block.from, head: block.from },
              scrollIntoView: true,
            });
            editor.focus();
          }
        });

        scopeSpan.addEventListener("touchstart", (e) => {
          if (this.pressTimer) clearTimeout(this.pressTimer);
          this.pressTimer = setTimeout(() => {
            scopeSpan.style.textDecoration = `underline ${getColorByType(block.type)}`;
            this.showCodePreviewPopup(block, fullCode, scopeSpan, filename);
          }, 480);
        });

        scopeSpan.addEventListener("touchend", () => {
          if (this.pressTimer) clearTimeout(this.pressTimer);
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

  /**
   * Tears down and cleans up registered memory structures, event bindings, and DOM traces.
   */
  public async destroy(): Promise<void> {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
    if (this.pressTimer) clearTimeout(this.pressTimer);

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

// Instantiate and bind entry point lifecycle Hooks
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

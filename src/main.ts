import { PLUGIN_ID } from "./configs/constant";
import { EditorView } from "@codemirror/view";
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
  private intervalId: any = null;
  private debounceTimeout: any = null;
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
      editorManager.on("switch-file", this.onFileSwitched);
    }

    this.injectUpdateListener(editor);
    this.updateBreadcrumbs(editor);
  }

  /**
   * Refreshes the structural layout when an alternative working file tab is selected.
   */
  private onFileSwitched = () => {
    const editor = editorManager.editor;
    if (editor && editor.dom) {
      this.currentEditor = editor;
      if (this.container) {
        editor.dom.prepend(this.container);
      }
      this.updateBreadcrumbs(editor);
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
   * Triggers background scope refresh updates when global text selection states change.
   */
  private onGlobalSelectionChange = () => {
    const editor = editorManager.editor;
    if (editor) {
      this.updateBreadcrumbs(editor);
    }
  };

  /**
   * Refreshes target active tracking coordinates on immediate cursor interaction events.
   */
  private onEditorUpdate = () => {
    const editor = editorManager.editor;
    if (editor) {
      setTimeout(() => this.updateBreadcrumbs(editor), 10);
    }
  };

  /**
   * Evaluates active node parsing trees and updates the DOM representation within the bar view.
   */
  public updateBreadcrumbs(editor: EditorView): void {
    const containerEl = this.container;
    if (!containerEl || !editor || !editor.state) return;

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

    // Fast teardown processing for existing nodes in previous state loops
    while (containerEl.firstChild) {
      containerEl.removeChild(containerEl.firstChild);
    }

    // Inject static leading baseline structural title header
    const prefix = document.createElement("span");
    prefix.style.cssText =
      "display: inline-flex; align-items: center; color: var(--text-color, var(--primary-text-color, #ffffff));";
    const breadcrumbsIconHtml = `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: none; stroke: var(--text-color, var(--primary-text-color, #ffffff)); stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; vertical-align: middle; margin-right: 5px;"><path d="M2 4h5v4H2zM9 4h5v2H9zm0 6h5v2H9zm-7 2h5v2H2z"/><path d="M4.5 8v4M11.5 6v4"/></svg>`;

    prefix.innerHTML = `${breadcrumbsIconHtml}Breadcrumbs`;
    containerEl.appendChild(prefix);

    // Build immutable geometric directional right-arrow vector asset item
    const baseSeparator = document.createElement("span");
    baseSeparator.style.cssText =
      "display: inline-flex; align-items: center; color: var(--text-color, var(--primary-text-color, #ffffff)); opacity: 0.7;";
    baseSeparator.innerHTML = `<i style="font-size: 15px; display: inline-block; vertical-align: middle;" class="icon keyboard_arrow_right"></i>`;

    containerEl.appendChild(baseSeparator.cloneNode(true));

    // Handle root execution block context mappings when node arrays return empty
    if (validScopes.length === 0) {
      const globalSpan = document.createElement("span");
      globalSpan.style.cssText =
        "display: inline-flex; align-items: center; color: var(--text-color, var(--primary-text-color, #ffffff));";

      const globalIconHtml = `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: none; stroke: var(--text-color, var(--primary-text-color, #ffffff)); stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; vertical-align: middle; margin-right: 5px;"><circle cx="8" cy="8" r="7"/><path d="M1 8h14M8 1a12 12 0 0 1 0 14M8 1a12 12 0 0 0 0 14"/></svg>`;
      globalSpan.innerHTML = `${globalIconHtml}Global`;
      containerEl.appendChild(globalSpan);
    } else {
      // Use standard fragment optimization approach for low layout repaint overheads
      const fragment = document.createDocumentFragment();

      validScopes.forEach((block: ScopeBlock, index: number) => {
        const scopeSpan = document.createElement("span");

        // Make scope elements clickable and prevent unintended highlights on active touch gestures
        scopeSpan.style.cssText =
          "display: inline-flex; align-items: center; gap: 3px; cursor: pointer; user-select: none;";

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

        fragment.appendChild(scopeSpan);

        // Inject directional chevron separator icons between individual block tracks
        if (index < validScopes.length - 1) {
          fragment.appendChild(baseSeparator.cloneNode(true));
        }
      });

      containerEl.appendChild(fragment);
    }

    // Force horizontal scroll states to lock at the tail edge for visibility on long paths
    containerEl.scrollLeft = containerEl.scrollWidth;
  }

  /**
   * Tears down and clean ups registered memory structures, event bindings, and DOM traces
   * upon extension unmount actions.
   */
  public async destroy(): Promise<void> {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.debounceTimeout) clearTimeout(this.debounceTimeout);

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

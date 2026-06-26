import { PLUGIN_ID } from "./configs/constant";
import { EditorView } from "@codemirror/view";
import { resolveBreadcrumbs, ScopeBlock } from "./utils/lezerParser";
import { getIconByType, getColorByType } from "./utils/patterns";

declare var editorManager: any;
declare var acode: any;

class BreadcrumbsPlugin {
  private container: HTMLDivElement | null = null;
  private intervalId: any = null;
  private debounceTimeout: any = null;
  private onFontChangeHandler: ((newAppFont: string) => void) | null = null;
  private currentEditor: EditorView | null = null;

  public async init(baseUrl: string, $page: any, cache: any): Promise<void> {
    const _ = { baseUrl, $page, cache };
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
      background-color: var(--secondary-color, #1e1e1e); 
      color: var(--text-color, var(--primary-text-color, #ffffff));
      font-family: ${appFont}, monospace; font-size: 11px; border-bottom: 1px solid var(--border-color, #333);
      overflow-x: auto; overflow-y: hidden; white-space: nowrap; box-sizing: border-box;
      z-index: 10; height: 28px;
    `;

    this.onFontChangeHandler = (newAppFont: string) => {
      if (this.container)
        this.container.style.fontFamily = `${newAppFont}, monospace`;
    };
    settings.on("update:appFont", this.onFontChangeHandler);

    editor.dom.prepend(this.container);

    if (editorManager && editorManager.on) {
      editorManager.on("switch-file", this.onFileSwitched);
    }

    this.injectUpdateListener(editor);
    this.updateBreadcrumbs(editor);
  }

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

  private injectUpdateListener(editor: EditorView) {
    // 💡 ကုဒ်ဟောင်းထဲက အကောင်းဆုံးဖြစ်တဲ့ အလုပ်အမြန်ဆုံး Native Global Selection Listener အား ပြန်လည်အသုံးပြုခြင်း
    // စိတ်မချရသော registerExtension စနစ်ကြီးအား လုံးဝဖယ်ထုတ်ပစ်လိုက်သည်
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

  private onGlobalSelectionChange = () => {
    const editor = editorManager.editor;
    // 💡 focus timing အောက်မကျစေရန် စစ်ဆေးချက်ကို ရိုးရှင်းအောင် ကုဒ်ဟောင်းအတိုင်း ပြန်ပြင်ဆင်သည်
    if (editor) {
      this.updateBreadcrumbs(editor);
    }
  };

  private onEditorUpdate = () => {
    const editor = editorManager.editor;
    if (editor) {
      // ၁၀ မီလီစက္ကန့်အတွင်း ချက်ချင်း update ဆွဲခေါ်ခြင်း
      setTimeout(() => this.updateBreadcrumbs(editor), 10);
    }
  };

  public updateBreadcrumbs(editor: EditorView): void {
    const containerEl = this.container;
    if (!containerEl || !editor || !editor.state) return;

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

    // 🚀 Lezer Parser Engine သို့ ပေးပို့၍ တိကျသော Structural scopes များကို ရယူခြင်း
    const validScopes = resolveBreadcrumbs(fullCode, pos);

    while (containerEl.firstChild) {
      containerEl.removeChild(containerEl.firstChild);
    }

    const prefix = document.createElement("span");
    prefix.style.cssText =
      "display: inline-flex; align-items: center; color: var(--text-color, var(--primary-text-color, #ffffff));";
    const breadcrumbsIconHtml = `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: none; stroke: var(--text-color, var(--primary-text-color, #ffffff)); stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; vertical-align: middle; margin-right: 5px;"><path d="M2 4h5v4H2zM9 4h5v2H9zm0 6h5v2H9zm-7 2h5v2H2z"/><path d="M4.5 8v4M11.5 6v4"/></svg>`;

    prefix.innerHTML = `${breadcrumbsIconHtml}Breadcrumbs`;
    containerEl.appendChild(prefix);

    const baseSeparator = document.createElement("span");
    baseSeparator.style.cssText =
      "display: inline-flex; align-items: center; color: var(--text-color, var(--primary-text-color, #ffffff)); opacity: 0.7;";
    baseSeparator.innerHTML = `<i style="font-size: 15px; display: inline-block; vertical-align: middle;" class="icon keyboard_arrow_right"></i>`;

    containerEl.appendChild(baseSeparator.cloneNode(true));

    if (validScopes.length === 0) {
      const globalSpan = document.createElement("span");
      globalSpan.style.cssText =
        "display: inline-flex; align-items: center; color: var(--text-color, var(--primary-text-color, #ffffff));";

      const globalIconHtml = `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: none; stroke: var(--text-color, var(--primary-text-color, #ffffff)); stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; vertical-align: middle; margin-right: 5px;"><circle cx="8" cy="8" r="7"/><path d="M1 8h14M8 1a12 12 0 0 1 0 14M8 1a12 12 0 0 0 0 14"/></svg>`;
      globalSpan.innerHTML = `${globalIconHtml}Global`;
      containerEl.appendChild(globalSpan);
    } else {
      const fragment = document.createDocumentFragment();

      validScopes.forEach((block: ScopeBlock, index: number) => {
        const scopeSpan = document.createElement("span");
        scopeSpan.style.cssText =
          "display: inline-flex; align-items: center; gap: 3px;";

        const iconHtml = getIconByType(block.type);
        const isLast = index === validScopes.length - 1;

        scopeSpan.innerHTML = `${iconHtml}<span style="color: ${getColorByType(block.type)}; font-weight: ${isLast ? "bold" : "normal"};">${block.name}</span>`;

        fragment.appendChild(scopeSpan);

        if (index < validScopes.length - 1) {
          fragment.appendChild(baseSeparator.cloneNode(true));
        }
      });

      containerEl.appendChild(fragment);
    }

    containerEl.scrollLeft = containerEl.scrollWidth;
  }

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

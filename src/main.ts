import { PLUGIN_ID } from "./configs/constant";
import { EditorView } from "@codemirror/view";
import {
  SCOPE_PATTERNS,
  IGNORED_KEYWORDS,
  getIconByType,
  getColorByType,
} from "./utils/patterns";

declare var editorManager: any;
declare var acode: any;

interface ScopeBlock {
  name: string;
  type: string;
  isAnonymous: boolean; // သာမန် အပိတ်အဖွင့်တွေအတွက် ခွဲခြားရန်
}

class BreadcrumbsPlugin {
  private container: HTMLDivElement | null = null;
  private intervalId: any = null;
  private onFontChangeHandler: ((newAppFont: string) => void) | null = null;

  public async init(baseUrl: string, $page: any, cache: any): Promise<void> {
    const _ = { baseUrl, $page, cache };
    this.intervalId = setInterval(() => {
      const editor = editorManager.editor;
      if (editor && editor.dom) {
        clearInterval(this.intervalId);
        this.setupBreadcrumbs(editor);
      }
    }, 200);
  }

  private setupBreadcrumbs(editor: EditorView) {
    if (this.container) this.container.remove();

    const settings: any = acode.require("settings");
    let appFont: string = settings.get("appFont") || "monospace";

    this.container = document.createElement("div");
    this.container.id = "acode-breadcrumbs-bar";

    this.container.style.cssText = `
      display: flex; align-items: center; gap: 6px; padding: 6px 12px;
      background-color: var(--secondary-color, #1e1e1e); 
      color: var(--text-color, var(--primary-text-color, #ffffff));
      font-family: ${appFont}, monospace; font-size: 11px; border-bottom: 1px solid var(--border-color, #333);
      overflow-x: auto; white-space: nowrap; box-sizing: border-box;
      z-index: 10; 
    `;

    this.onFontChangeHandler = (newAppFont: string) => {
      if (this.container) {
        this.container.style.fontFamily = `${newAppFont}, monospace`;
      }
    };
    settings.on("update:appFont", this.onFontChangeHandler);

    editor.dom.prepend(this.container);

    if (editorManager && editorManager.on) {
      editorManager.on("switch-file", this.onEditorUpdate);
    }

    this.injectUpdateListener(editor);
    this.updateBreadcrumbs(editor);
  }

  private injectUpdateListener(editor: any) {
    if (editor.dom) {
      editor.dom.addEventListener("focusin", this.onEditorUpdate);
    }
    document.addEventListener("selectionchange", this.onGlobalSelectionChange);
  }

  private onGlobalSelectionChange = () => {
    const editor = editorManager.editor;
    if (editor && editor.hasFocus) {
      this.updateBreadcrumbs(editor);
    }
  };

  private onEditorUpdate = () => {
    const editor = editorManager.editor;
    if (editor) {
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

    const state = editor.state;
    const pos = state.selection.main.head;
    const targetLineNum = state.doc.lineAt(pos).number;

    // အစစ်အမှန် Braces Stack စနစ်
    let braceStack: ScopeBlock[] = [];

    for (let i = 1; i <= targetLineNum; i++) {
      let lineText = state.doc.line(i).text;

      // ၁။ Inline Comment များ ဖြတ်ထုတ်ခြင်း
      lineText = lineText.replace(/(?!https?:)\/\/.*$/, "");

      const trimmed = lineText.trim();

      if (
        !trimmed ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*/")
      ) {
        continue;
      }

      // စာလုံးတစ်လုံးချင်းစီကို Scan ဖတ်ပြီး ဖွင့်/ပိတ် ကွက်တိ စစ်ဆေးခြင်း
      let matchedInLine = false;
      let matchedBlock: ScopeBlock | null = null;

      // ၂။ Regex Pattern ကို လက်ရှိ lineText အတိုင်း အရင်ရှာဖွေ စစ်ဆေးခြင်း
      for (const p of SCOPE_PATTERNS) {
        const match = lineText.match(p.regex);
        if (match) {
          if (
            [
              "for",
              "for-in",
              "for-of",
              "while",
              "do-while",
              "switch",
              "if",
              "else",
              "try",
              "catch",
            ].includes(p.type)
          ) {
            matchedBlock = { name: p.type, type: p.type, isAnonymous: false };
            matchedInLine = true;
            break;
          }

          const nameIdx =
            p.type === "class" || (p.type === "function" && match[2]) ? 2 : 1;
          const rawName = match[nameIdx];

          if (rawName && !IGNORED_KEYWORDS.includes(rawName)) {
            matchedBlock = { name: rawName, type: p.type, isAnonymous: false };
            matchedInLine = true;
            break;
          }
        }
      }

      // 💡 [NEW LOGIC] Character Scan မဖတ်မီ ကွင်း () ထဲ၌ ပါဝင်သော အရာအားလုံးကို ဖယ်ထုတ်ပစ်ခြင်း
      // ဤသို့ဖြင့် ({ posts }) ကဲ့သို့သော ညှပ်ကွင်းများကြောင့် ကွင်းအရေအတွက် လွဲချော်ခြင်း လုံးဝ မရှိတော့ပါ
      let scanLine = lineText.replace(/\([^]*?\)/g, "()");

      // ၃။ ကွင်းအရေအတွက် Scan ဖတ်သည့်နေရာတွင် scanLine ကို သုံးပါမည်
      for (let ch = 0; ch < scanLine.length; ch++) {
        const char = scanLine[ch];

        if (char === "{" || char === "[") {
          if (matchedInLine && matchedBlock) {
            braceStack.push(matchedBlock);
            matchedInLine = false; // တစ်ခါပဲ Push ဖို့ ကာကွယ်ခြင်း
          } else {
            // Pattern မမိဘဲ ပွင့်လာတဲ့ ကွင်းတွေကို Anonymous အဖြစ် မှတ်ထားမယ်
            braceStack.push({
              name: "{anonymous}",
              type: "anonymous",
              isAnonymous: true,
            });
          }
        } else if (char === "}" || char === "]") {
          if (braceStack.length > 0) {
            braceStack.pop(); // ကွင်းပိတ်တာနဲ့ Stack ပေါ်ဆုံးက ကောင်ကို တန်းဖြုတ်မယ်
          }
        }
      }
    }

    // Render ပြခါနီးရင် Anonymous ကောင်တွေကို ဖယ်ပြီး တကယ့် Valid Scopes တွေကိုပဲ ယူမယ်
    const validScopes = braceStack.filter((b) => !b.isAnonymous);

    // --- HTML UI Layout Rendering ---
    containerEl.innerHTML = "";

    const prefix = document.createElement("span");
    prefix.style.display = "inline-flex";
    prefix.style.alignItems = "center";
    const breadcrumbsIconHtml = `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: var(--text-color, var(--primary-text-color, #ffffff)); vertical-align: middle; margin-right: 5px;"><path d="M1 3h4v1H1V3zm5 2.5l2-2 2 2v1l-1.5-1.5V9h-1V5l-1.5 1.5v-1zM11 7h4v1h-4V7zm2 4h2v1h-2v-1zm-6 2h4v1H7v-1zM2 9h3v1H2V9z"/></svg>`;

    prefix.innerHTML = `${breadcrumbsIconHtml}Breadcrumbs`;
    prefix.style.color =
      "var(--text-color, var(--primary-text-color, #ffffff))";
    containerEl.appendChild(prefix);

    const separatorRoot = document.createElement("span");
    separatorRoot.style.display = "inline-flex";
    separatorRoot.style.alignItems = "center";
    separatorRoot.innerHTML = `<i style="font-size: 15px; display: inline-block; vertical-align: middle;" class="icon keyboard_arrow_right"></i>`;
    separatorRoot.style.color =
      "var(--text-color, var(--primary-text-color, #ffffff))";
    containerEl.appendChild(separatorRoot);

    if (validScopes.length === 0) {
      const globalSpan = document.createElement("span");
      globalSpan.style.display = "inline-flex";
      globalSpan.style.alignItems = "center";
      globalSpan.textContent = "Global";
      globalSpan.style.color =
        "var(--text-color, var(--primary-text-color, #ffffff))";
      containerEl.appendChild(globalSpan);
    } else {
      validScopes.forEach((block, index) => {
        const scopeSpan = document.createElement("span");
        scopeSpan.style.display = "inline-flex";
        scopeSpan.style.alignItems = "center";

        const iconHtml = getIconByType(block.type);
        scopeSpan.innerHTML = `${iconHtml}<span style="color: ${getColorByType(block.type)}; font-weight: bold;">${block.name}</span>`;

        containerEl.appendChild(scopeSpan);

        if (index < validScopes.length - 1) {
          const sep = document.createElement("span");
          sep.style.display = "inline-flex";
          sep.style.alignItems = "center";
          sep.innerHTML = `<i style="font-size: 15px; display: inline-block; vertical-align: middle;" class="icon keyboard_arrow_right"></i>`;
          sep.style.color =
            "var(--text-color, var(--primary-text-color, #ffffff))";
          containerEl.appendChild(sep);
        }
      });
    }
  }

  public async destroy(): Promise<void> {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.onFontChangeHandler) {
      const settings: any = acode.require("settings");
      settings.off("update:appFont", this.onFontChangeHandler);
    }
    document.removeEventListener(
      "selectionchange",
      this.onGlobalSelectionChange,
    );
    const editor = editorManager.editor;
    if (editor && editor.dom) {
      editor.dom.removeEventListener("focusin", this.onEditorUpdate);
    }
    if (editorManager && editorManager.off) {
      editorManager.off("switch-file", this.onEditorUpdate);
    }
    if (this.container) this.container.remove();
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

import { PLUGIN_ID } from "./configs/constant";
import { EditorView } from "@codemirror/view";

declare var editorManager: any;
declare var acode: any;

interface ScopeBlock {
  name: string;
  type: string;
  indent: number;
}

class BreadcrumbsPlugin {
  private container: HTMLDivElement | null = null;
  private intervalId: any = null;

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

    this.container = document.createElement("div");
    this.container.id = "acode-breadcrumbs-bar";

    this.container.style.cssText = `
      display: flex; align-items: center; gap: 6px; padding: 6px 12px;
      background-color: var(--secondary-color, #1e1e1e); 
      color: var(--text-color, var(--primary-text-color, #ffffff));
      font-family: monospace; font-size: 11px; border-bottom: 1px solid var(--border-color, #333);
      overflow-x: auto; white-space: nowrap; box-sizing: border-box;
      z-index: 10;
    `;

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

  private getIconByType(type: string): string {
    switch (type) {
      case "class":
        // 🟡 Yellow Beautiful Class Brackets Box Icon ({})
        return `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: #f1c40f; vertical-align: middle; margin-right: 3px;"><path d="M4 1.5h2v1H5c-.6 0-1 .4-1 1v3c0 .6-.4 1-1 1h-.5v1H3c.6 0 1 .4 1 1v3c0 .6.4 1 1 1h1v1H4c-1.1 0-2-.9-2-2v-2.5c0-.6-.4-1-1-1v-1c.6 0 1-.4 1-1V3.5c0-1.1.9-2 2-2zm8 0h-2v1h1c.6 0 1 .4 1 1v3c0 .6.4 1 1 1h.5v1h-.5c-.6 0-1 .4-1 1v3c0 .6-.4 1-1 1h-1v1h2c1.1 0 2-.9 2-2v-2.5c0-.6.4-1 1-1v-1c-.6 0-1-.4-1-1V3.5c0-1.1-.9-2-2-2z"/></svg>`;
      case "method":
        // 🟣 Purple Method Icon (Cube)
        return `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: #9b59b6; vertical-align: middle; margin-right: 3px;"><path d="M8 1l6 3.5v7L8 15l-6-3.5v-7L8 1zm4.8 4.1L8 2.3 3.2 5.1 8 7.9l4.8-2.8zM2.5 6.4v4.5l5 2.9V9.3l-5-2.9zm6 2.9v4.5l5-2.9V6.4l-5 2.9z"/></svg>`;
      case "function":
        // 🔵 Blue Function Icon (ƒ / Lambda)
        return `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: #3498db; vertical-align: middle; margin-right: 3px;"><path d="M10.5 2h-2c-1.4 0-2.5 1.1-2.5 2.5V7H4v2h2v5h2V9h2.5V7H8V4.5c0-.3.2-.5.5-.5h2V2z"/></svg>`;
      case "arrow":
      case "callback":
        // 🟢 Teal Arrow Function Icon (=>)
        return `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: #1abc9c; vertical-align: middle; margin-right: 3px;"><path d="M2 4h6v2H2V4zm7.2 1.3l2.5 2.2-2.5 2.2 1.1 1.3 4-3.5-4-3.5-1.1 1.3zM2 10h6v2H2v-2z"/></svg>`;
      case "array":
        // 🟢 Teal Array Square Brackets Icon ([])
        return `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: #1abc9c; vertical-align: middle; margin-right: 3px;"><path d="M3 1.5h3v1H4v11h2v1H3v-13zm10 0h-3v1h2v11h-2v1h3v-13z"/></svg>`;
      case "objectKey":
      case "object":
        // 🟢 Teal Property Field List Icon
        return `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: #1abc9c; vertical-align: middle; margin-right: 3px;"><path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z"/></svg>`;
      case "listener":
        // 💗 Event Listener Pink Lightning Icon
        return `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: #e84393; vertical-align: middle; margin-right: 3px;"><path d="M11 1L3 9h4v6l8-8h-5z"/></svg>`;
      case "type":
        // 🟠 Orange TypeScript Type Badge Icon (T)
        return `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: #e67e22; vertical-align: middle; margin-right: 3px;"><path d="M2 2h12v3h-2V4H9v10H7V4H4v1h-2V2z"/></svg>`;
      default:
        return "";
    }
  }

  private getColorByType(type: string): string {
    switch (type) {
      case "class":
        return "#f1c40f";
      case "method":
        return "#9b59b6";
      case "function":
        return "#3498db";
      case "arrow":
      case "callback":
      case "objectKey":
      case "object":
      case "array":
        return "#1abc9c";
      case "listener":
        return "#e84393";
      case "type":
        return "#e67e22";
      default:
        return "var(--text-color, var(--primary-text-color, #ffffff))";
    }
  }

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

    let scopeStack: ScopeBlock[] = [];

    const patterns = [
      {
        type: "class",
        regex:
          /^\s*(?:export\s+(?:default\s+)?)?(?:class|interface)\s+([a-zA-Z0-9_$]+)/,
      },
      {
        type: "method",
        regex:
          /^\s*(?:(?:public|private|protected|static|async|get|set)\s+)*\*?\s*([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*(?::\s*[a-zA-Z0-9_$<>|[\]{}]+)?\s*\{?/,
      },
      {
        type: "arrow",
        regex:
          /^\s*(?:const|let|var|private|public|protected|static)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*(?::\s*[a-zA-Z0-9_$<>|[\]{}]+)?\s*=>\s*\{?/,
      },
      {
        type: "function",
        regex:
          /^\s*(?:export\s+(?:default\s+)?)?function\s*\*?\s*([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*(?::\s*[a-zA-Z0-9_$<>|[\]{}]+)?\s*\{?/,
      },
      // ✨ [Array Fix] Array Literals & Typed Arrays (e.g. const seedUsers: User[] = [)
      {
        type: "array",
        regex:
          /^\s*(?:const|let|var|export)\s+([a-zA-Z0-9_$]+)\s*(?::\s*[a-zA-Z0-9_$<>|[\]{}]+)?\s*=\s*\[/,
      },
      {
        type: "object",
        regex: /^\s*(?:const|let|var|export)\s+([a-zA-Z0-9_$]+)\s*=\s*\{/,
      },
      {
        type: "listener",
        regex: /^\s*([a-zA-Z0-9_$]+(?:\.[a-zA-Z0-9_$]+)*\.addEventListener)/,
      },
      {
        type: "type",
        regex: /^\s*(?:export\s+)?type\s+([a-zA-Z0-9_$]+)\s*=\s*\{?/,
      },
      // ✨ [Method Name Fix] users.map, users.filter စသည်ဖြင့် တကယ့် Method နာမည်ကို တိုက်ရိုက်ဆွဲထုတ်ယူခြင်း
      {
        type: "callback",
        regex:
          /([a-zA-Z0-9_$]+)\.([a-zA-Z0-9_$]+)\s*\(\s*(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>\s*\{?/,
      },
      {
        type: "objectKey",
        regex: /^\s*([a-zA-Z0-9_$]+)\s*:\s*\{/,
      },
    ];

    for (let i = 1; i <= targetLineNum; i++) {
      const lineText = state.doc.line(i).text;
      const trimmed = lineText.trim();

      if (
        !trimmed ||
        trimmed.startsWith("//") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("/*")
      ) {
        continue;
      }

      const currentIndent = lineText.match(/^\s*/)?.[0].length || 0;

      while (
        scopeStack.length > 0 &&
        scopeStack[scopeStack.length - 1].indent >= currentIndent
      ) {
        scopeStack.pop();
      }

      let matchedName = "";
      let matchedType = "";

      for (const p of patterns) {
        const match = lineText.match(p.regex);
        if (match) {
          const rawName = match[1];
          if (
            rawName &&
            ![
              "if",
              "for",
              "while",
              "switch",
              "catch",
              "return",
              "const",
              "let",
              "var",
            ].includes(rawName)
          ) {
            // ✨ Dynamic Method Mapping Logic (`users.callback` အစား `users.map` စသည်ဖြင့် ပြောင်းလဲခြင်း)
            matchedName =
              p.type === "callback" ? `${rawName}.${match[2]}` : rawName;
            matchedType = p.type;
            break;
          }
        }
      }

      if (matchedName) {
        scopeStack.push({
          name: matchedName,
          type: matchedType,
          indent: currentIndent,
        });
      }
    }

    containerEl.innerHTML = "";

    const prefix = document.createElement("span");
    prefix.textContent = "Symbols";
    prefix.style.color =
      "var(--text-color, var(--primary-text-color, #ffffff))";
    containerEl.appendChild(prefix);

    const separatorRoot = document.createElement("span");
    separatorRoot.textContent = " › ";
    separatorRoot.style.color =
      "var(--text-color, var(--primary-text-color, #ffffff))";
    containerEl.appendChild(separatorRoot);

    if (scopeStack.length === 0) {
      const globalSpan = document.createElement("span");
      globalSpan.textContent = "Global";
      globalSpan.style.color =
        "var(--text-color, var(--primary-text-color, #ffffff))";
      containerEl.appendChild(globalSpan);
    } else {
      scopeStack.forEach((block, index) => {
        const scopeSpan = document.createElement("span");
        scopeSpan.style.display = "inline-flex";
        scopeSpan.style.alignItems = "center";

        const iconHtml = this.getIconByType(block.type);
        scopeSpan.innerHTML = `${iconHtml}<span style="color: ${this.getColorByType(block.type)}; font-weight: bold;">${block.name}</span>`;

        containerEl.appendChild(scopeSpan);

        if (index < scopeStack.length - 1) {
          const sep = document.createElement("span");
          sep.textContent = " › ";
          sep.style.color =
            "var(--text-color, var(--primary-text-color, #ffffff))";
          containerEl.appendChild(sep);
        }
      });
    }
  }

  public async destroy(): Promise<void> {
    if (this.intervalId) clearInterval(this.intervalId);
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

import { PLUGIN_ID } from "./configs/constant";
import { EditorView } from "@codemirror/view";
import { parser as jsParser } from "@lezer/javascript";
import { highlightCode, classHighlighter } from "@lezer/highlight";
import { resolveBreadcrumbs, ScopeBlock } from "./utils/lezerParser";
import { getIconByType, getColorByType } from "./utils/patterns";

declare var editorManager: any;
declare var acode: any;

export class BreadcrumbsPlugin {
  private container: HTMLDivElement | null = null;
  private pathContainer: HTMLSpanElement | null = null;
  private prefixTextEl: HTMLSpanElement | null = null; // 🌟 Added: Target reference for dynamic filename syncing
  private intervalId: any = null;
  private debounceTimeout: any = null;
  private pressTimer: any = null;
  private onFontChangeHandler: ((newAppFont: string) => void) | null = null;
  private currentEditor: EditorView | null = null;

  // --- Optimization State Caches ---
  private lastDocString: string = "";
  private lastScopesFingerprint: string = "";
  private activePopupCleanup: (() => void) | null = null;
  private blockClickBypass: boolean = false;

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
      background-color: var(--primary-color, #1e1e1e); 
      color: var(--text-color, var(--primary-text-color, #ffffff));
      font-family: ${appFont}, monospace; font-size: 11px; box-shadow: 0 2px 4px var(--box-shadow-color, rgba(0,0,0,0.2));
      overflow-x: auto; overflow-y: hidden; white-space: nowrap; box-sizing: border-box;
      z-index: 10; height: 28px;
    `;

    let currentFile = editorManager.activeFile;
    let filename = currentFile ? currentFile.filename.toLowerCase() : "";

    const prefix = document.createElement("span");
    prefix.style.cssText =
      "display: inline-flex; align-items: center; color: var(--text-color, var(--primary-text-color, #ffffff)); flex-shrink: 0;";
    // 🌟 Modified: Render only the SVG wrapper structure here
    prefix.innerHTML = `<svg viewBox="0 0 16 16" width="12" height="12" style="fill: none; stroke: var(--text-color, var(--primary-text-color, #ffffff)); stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; vertical-align: middle; margin-right: 5px;"><path d="M2 4h5v4H2zM9 4h5v2H9zm0 6h5v2H9zm-7 2h5v2H2z"/><path d="M4.5 8v4M11.5 6v4"/></svg>`;

    // 🌟 Added: Create a specific text node for filename to enable reactive data-binding
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

      // Reset cache keys on file tab migration
      this.lastDocString = "";
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
    this.debounceTimeout = setTimeout(() => {
      this.updateBreadcrumbs(editor);
    }, 150);
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

    const iconStr = getIconByType(block.type);
    const colorStr = getColorByType(block.type);

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
            // @ts-ignore
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

    const onTouchEndResize = () => {
      document.removeEventListener("touchmove", onTouchMoveResize);
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

    // 🌟 Added: Smoothly synchronize the active filename on every verification pass
    if (this.prefixTextEl) {
      this.prefixTextEl.textContent = currentFile
        ? currentFile.filename
        : "Breadcrumbs";
    }

    if (!containerEl.parentElement && editor.dom) {
      editor.dom.prepend(containerEl);
    }

    const state = editor.state;
    const pos = state.selection.main.head;
    const fullCode = state.doc.toString();

    const validScopes = resolveBreadcrumbs(fullCode, pos);

    let currentFingerprint = "";
    for (let i = 0; i < validScopes.length; i++) {
      currentFingerprint += `${validScopes[i].type}-${validScopes[i].from}-${validScopes[i].to}|`;
    }

    if (
      fullCode === this.lastDocString &&
      currentFingerprint === this.lastScopesFingerprint
    ) {
      return;
    }
    this.lastDocString = fullCode;
    this.lastScopesFingerprint = currentFingerprint;

    while (pathEl.firstChild) {
      pathEl.removeChild(pathEl.firstChild);
    }

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

        const iconHtml = getIconByType(block.type);
        const isLast = index === validScopes.length - 1;
        scopeSpan.innerHTML = `${iconHtml}<span style="color: ${getColorByType(block.type)}; font-weight: ${isLast ? "bold" : "normal"};">${block.name}</span>`;

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
          this.pressTimer = setTimeout(() => {
            this.blockClickBypass = true;
            scopeSpan.style.textDecoration = `underline ${getColorByType(block.type)}`;
            this.showCodePreviewPopup(block, fullCode, scopeSpan, filename);
          }, 480);
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
    this.prefixTextEl = null; // Clean target reference allocation
    this.currentEditor = null;
    this.lastDocString = "";
    this.lastScopesFingerprint = "";
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

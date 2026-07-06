import type { EditorView } from "@codemirror/view";
import { PLUGIN_ID } from "../configs/constant";
import { ScopeBlock } from "../utils/lezerParser";
import { getIconByType } from "../utils/patterns";
import { getCustomColor } from "../utils/colorResolver";
import { highlightCodeSnippet } from "../utils/highlight";

/**
 * Configuration options for creating and anchoring the Code Preview Popup.
 */
export interface CodePreviewPopupOptions {
  /** The code structural block data retrieved from the AST parser. */
  block: ScopeBlock;
  /** The complete un-sliced raw source code of the active file. */
  fullCode: string;
  /** The triggering HTML breadcrumb target element used to anchor or associate state. */
  scopeSpan: HTMLSpanElement;
  /** The active file's filename used for language dialect extraction. */
  filename: string;
  /** The active CodeMirror editor view instance. */
  editor: EditorView | null;
  /** The bounding container component serving as the absolute anchor point. */
  container: HTMLDivElement | null;
  /**
   * Registry callback to pass the inner popup disposal logic back to the orchestrating plugin layer.
   * This allows the parent controller to close open instances on initialization requests.
   *
   * @param cleanup - Function that detaches listeners and dismounts elements, or null.
   */
  registerCleanup: (cleanup: (() => void) | null) => void;
}

/**
 * Instantiates and appends a floating code preview popup modal to the DOM.
 * Renders syntax-highlighted snippets inside an isolated container with structural overlay interfaces
 * supporting interactive resizing, clipboard operations, and responsive viewport macro-maximization.
 *
 * @param options - Configuration options and element references required to build the popup interface.
 * @returns Void. Side effect appends an absolute styled overlay box to document.body.
 */
export function showCodePreviewPopup(options: CodePreviewPopupOptions): void {
  const {
    block,
    fullCode,
    scopeSpan,
    filename,
    editor,
    container,
    registerCleanup,
  } = options;

  // Prevent initializing floating elements if CodeMirror view is not attached to the live DOM
  if (!editor || !editor.dom) return;

  // Extract the specific code slice matching the targeted block's byte bounds
  const completeBlockCode = fullCode.slice(block.from, block.to);

  // Performance Guard: Truncate large code segments to prevent UI rendering lockups
  let codeSnippet = completeBlockCode.trim();
  if (codeSnippet.length > 2500) {
    codeSnippet =
      codeSnippet.slice(0, 2500) +
      "\n\n/* ... (Truncated for layout performance) ... */";
  }

  // Calculate top offset position based on breadcrumbs bounding region bounds
  let popupTop = 32;
  if (container) {
    popupTop = container.getBoundingClientRect().bottom + 4;
  }

  // Parse color tokens from active editor styles to build consistent theme configurations
  const computedStyle = window.getComputedStyle(editor.dom);
  let editorBg = computedStyle.backgroundColor;
  let editorFg = computedStyle.color;

  // Traverse downstream to find container nodes if root editor node styles are clear or unpopulated
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

  // Extract color vectors from editor background to interpolate uniform semi-transparent acrylic overlays
  let acrylicBg = "rgba(30, 30, 30, 0.75)";
  const rgbValues = editorBg.match(/\d+/g);
  if (rgbValues && rgbValues.length >= 3) {
    acrylicBg = `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 0.75)`;
  }

  // Instantiation of global container root nodes
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

  // Dynamic fallback style engine initialization when standard highlighting themes are absent
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

  // Component Building: Window Title Bar Setup
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

  // Fetch contextual features and preferences to initialize header icon tokens
  const settings: any = acode.require("settings");
  const pluginSettings = settings.value[PLUGIN_ID] || {};
  const showIcons = pluginSettings.showIcons !== false;
  const colorStr = getCustomColor(block.type);
  const iconStr = showIcons ? getIconByType(block.type, colorStr) : "";

  headerLabel.innerHTML = `
    <span style="opacity: 0.45; font-size: 9px; font-weight: normal; letter-spacing: 0.3px;">Ln.${block.line}</span>
    <span style="color: ${colorStr}; display: flex; align-items: center; gap: 4px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
      ${iconStr} ${block.name}
    </span>
  `;
  titleBar.appendChild(headerLabel);

  // Component Building: Clipboard Copy Action Button Configuration
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
        // Legacy fallback method for execution platforms running older System WebView containers
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

  // Component Building: Scrollable Code Viewport Initialization
  const contentRegion = document.createElement("div");
  contentRegion.style.cssText =
    "flex: 1; overflow: auto; padding: 12px; line-height: 1.45; font-size:12px;";

  const codeTag = document.createElement("code");
  codeTag.style.cssText = "display: block; white-space: pre;";
  codeTag.innerHTML = highlightCodeSnippet(codeSnippet, filename, block);
  contentRegion.appendChild(codeTag);
  popup.appendChild(contentRegion);

  // Component Building: Drag Resize Handle Implementation
  const resizeHandle = document.createElement("div");
  resizeHandle.style.cssText =
    "position: absolute; right: 0; bottom: 0; width: 18px; height: 18px; cursor: se-resize; background: linear-gradient(135deg, transparent 40%, rgba(128,128,128,0.4) 100%); border-bottom-right-radius: 12px; z-index: 10005;";
  popup.appendChild(resizeHandle);

  let startTouchX = 0,
    startTouchY = 0,
    startWidth = 0,
    startHeight = 0;

  /**
   * Dispatches resize parameters on initialization of layout drag interaction sequences.
   */
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

  /**
   * Tracks and applies dynamic delta mutations to update container size properties.
   */
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

  /**
   * Detaches layout drag listeners safely from global document scope listeners.
   */
  const onTouchEndResize = () => {
    document.removeEventListener("touchmove", onTouchMoveResize_1);
    document.removeEventListener("touchend", onTouchEndResize);
  };
  resizeHandle.addEventListener("touchstart", onTouchStartResize, {
    passive: false,
  });

  // Inject configured elements directly into the application DOM tree
  document.body.appendChild(popup);

  let isMaximized = false;
  let preNavStyles = { width: "", height: "", top: "", left: "" };

  /**
   * Dismounts popup interfaces from the DOM tree and clears tracking event instances cleanly.
   */
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

    registerCleanup(null);
  };

  // Register internal lifecycle closure routines to external handlers
  registerCleanup(dismissPopup);

  /**
   * Intercepts pointer events outside container coordinates to orchestrate backdrop dismiss actions.
   */
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
      // Transition from current dimensions into localized macro viewport boundaries
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
      // Revert from maximized state back to original bound styles
      popup.style.top = preNavStyles.top;
      popup.style.left = preNavStyles.left;
      popup.style.width = preNavStyles.width;
      popup.style.height = preNavStyles.height;
      isMaximized = false;
    }
  });

  // Defer attaching trigger listeners to bypass synchronization conflicts with instant modal initialization events
  setTimeout(() => {
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("mousedown", handleOutsideClick);
  }, 150);
}

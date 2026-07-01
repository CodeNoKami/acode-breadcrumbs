# Acode Breadcrumbs Plugin

A smart, high-performance, and **theme-adaptive VS Code-style Breadcrumbs navigation bar** for Acode Editor. It brings desktop-grade code structure visibility and fluid navigation right onto your mobile screen, mapping out your classes, methods, functions, arrays, and objects in real-time using a powerful Hybrid AST Parsing Engine.

## 📸 Previews

### Flawless Nested Scope Tracking & Dynamic Methods [v2.4.0+]

Active architectural representation mapping cleanly from the active filename down through Classes, Methods, Array Operations, and deeply nested blocks or IIFEs:

```
database.ts › 🔲 DatabaseService › 📦 constructor
userController.js › 🍇 usersList.filter
app.tsx › 🔄 iifeModule

```

### TypeScript Type & Data Awareness

Clean UI feedback for advanced TS definitions, Type annotations, Arrays, Variables, and nested Configurations:

```
types.ts › 📄 UserRole › 🟢 config_list › 🗂️ properties

```

## ✨ Features

- **🗂️ VS Code-Parity Path Mapping [v2.4.0+]:** Reconfigured the layout sequence to follow a strict Filename › Scope › Sub-Scope hierarchy. The breadcrumbs bar anchors your active filename as the root node before drilling down into the code structure, mirroring desktop IDE standards perfectly.
- **🎨 Full 12-Node Color Customization Suite [v2.5.0]:** Expanded the preferences panel with dedicated hex-color inputs for all primary architectural tokens (Class, Interface, Type, Enum, Method, Function, Arrow, Property, Object, Array, Variable, and JSX).
- **🔄 Synchronized Icon & Typography Palettes [v2.5.0]:** Completely overhauled the vector graphics engine. Customizing a scope color now automatically updates both the text label and its corresponding SVG icon dynamically, replacing the legacy behavior where icons remained hardcoded to default purple (#D694FF).
- **⚙️ Advanced UI & Interaction Toggles [v2.5.0]:** Added explicit controls to fully personalize your workspace:
  - showIcons: Globally toggles structural layout icons on/off across both the main navigation bar and code popups.
  - disablePreviewPopup: Allows users to turn off the long-press preview card behavior entirely for a lower footprint.
- **⚡ Performance & Delay Calibration [v2.5.0]:** High-precision settings adjustments to balance performance and touch responses:
  - previewDelay: Configurable long-press holding thresholds (300ms Fast, 480ms Normal, 800ms Slow) to control popup responsiveness.
  - pollingDebounceTimeout: Tailorable AST parsing debounce windows (100ms for aggressive indexing up to 400ms Eco Battery Saver for lower-end devices).
- **🛡️ Automated Hex Formatting Sanitizer [v2.5.0]:** Built-in input validator that automatically checks custom color settings and prepends the missing # prefix to raw hexadecimal strings to ensure bulletproof CSS styling.
- **🚀 Reactive Cache-Flush Engine [v2.5.0]:** Implements a clearCache() pipeline that flushes internal code fingerprint caches instantly upon updating settings, forcing an immediate visual repaint without requiring a file reload or application restart.
- **🎯 Interactive Code Navigation [v2.2.0+]:** Every scope element rendered on the bar is **fully clickable**. Clicking a scope path item instantly jumps your editor cursor directly to the corresponding block's start position (from offset) and immediately refocuses the editor.
- **🧹 Noise-Free Architectural Outline [v2.4.0+]:** Intelligently filters out low-level control-flow scopes (such as if, for, while, and try-catch blocks). By focusing purely on structural definitions, the interface remains impeccably clean and distraction-free.
- **🔍 Long-Press Code Preview & Theme-Adaptive Highlights [v2.2.2+]:** Long-pressing any breadcrumb item triggers a high-definition code snippet preview popup strictly anchored beneath the navigation bar. Powered by a luminance-aware engine that automatically matches your active editor theme (Dark/Light).
- **📐 Native Mobile Touch Resizing [v2.3.3+]:** Engineered with a native touchscreen drag gesture handle at the bottom corner of the preview popup. Users can dynamically scale the preview window height and width smoothly.

## 🎨 Icon & Theme Standards Map

_(Note: All palette colors listed below represent the premium matte defaults and can be fully customized inside the plugin settings panel)._
| Symbol Type | UI Icon | Default Palette | Description / Node Type Match |
|---|---|---|---|
| **Class / Interface** | 🔲 | #FFB834 / #46D9FF | OOP Bracket Frame Boundary & TypeScript Contracts |
| **Type Alias / Enum** | 📄 | #10E5FA / #00F5D4 | TS Explicit Types, Enums & Definition Specs |
| **Method** | 📦 | #D694FF | Soft Lavender Purple / VS Code-Style 3D Method Wireframe & Constructors |
| **Function / Arrow** | 𝑓 / 🔄 | #60A5FA / #34D399 | Neon Blue global scopes & Lambda Callbacks / IIFEs |
| **Variable / Property** | 🟢 / 🗂️ | #4ADE80 / #99E65F | Local Block-Scoped variables & Object Property keys |
| **Object / Array** | 📦 / 📊 | #6EE7B7 / #FCD34D | Data Structure Boundaries, Map Definitions & Array Lists |
| **JSX Element** | ⚛️ | #22D3EE | Bright Sky React Blue / UI Components & Helix Fragments |

## 🖼️ Preview Images

![Breadcrumbs Preview 1](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview1.png)
![Breadcrumbs Preview 2](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview2.png)
![Breadcrumbs Preview 3](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview3.png)
![Breadcrumbs Preview 4](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview4.png)
![Breadcrumbs Preview 5](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview5.png)
![Popup Preview Screenshot Light](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview_screenshot_light.png)
![Popup Preview Screenshot Dark](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview_screenshot_dark.png)

## 📦 Installation & Build

If you are maintaining this plugin locally or building it from source inside your development environment:

1.  **Clone the repository:**

```bash
git clone https://github.com/CodeNoKami/acode-breadcrumbs.git
cd acode-breadcrumbs

```

2.  **Install dependencies:**

```bash
npm install

```

3.  **Compile and Bundle:**

```bash
npm run build

```

4.  **Output:** The compiled production ZIP bundle will be generated inside your root project directory, fully compressed and optimized, ready to be imported straight into Acode.

## 🛠️ Tech Stack & Configuration

- **Version:** v2.5.0 (Fully Customizable Palette & Preferences Release)
- **Language:** TypeScript 5+ (Strict Type Checking)
- **Parser Core:** CodeMirror 6 Lezer JavaScript/TypeScript Dialect Tree
- **Framework Integration:** Acode Extension Lifecycle API
- **Bundler:** Esbuild / Custom lightweight bundling pipelines

## 📄 License

MIT License. Feel free to fork, customize, and extend! Created with 💻 by CodeNoKami.

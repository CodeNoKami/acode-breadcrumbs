# Acode Breadcrumbs Plugin

A smart, high-performance, and **theme-adaptive VS Code-style Breadcrumbs navigation bar** for Acode Editor. It brings desktop-grade code structure visibility and fluid navigation right onto your mobile screen, mapping out your classes, methods, functions, arrays, and objects in real-time using a powerful Hybrid AST Parsing Engine.

## 📸 Previews

### Flawless Nested Scope Tracking & Dynamic Methods

Active scope representation mapping smoothly from Classes to Methods, Array Operations, and deeply nested blocks or IIFEs:

```
Symbols › 📦 DatabaseService › 📦 constructor
Symbols › 🍇 usersList.filter › 🔄 anonymous
Symbols › 🔄 iifeModule › 🔄 anonymous

```

### TypeScript Type & Data Awareness

Clean UI feedback for advanced TS definitions, Type annotations, Arrays, Variables, and nested Configurations:

```
Symbols › 📄 UserRole › 🟢 config_list › 🗂️ properties

```

## ✨ Features

- **🎯 Interactive Code Navigation [v2.2.0+]:** Every scope element rendered on the bar is **fully clickable**. Clicking a scope path item instantly jumps your editor cursor directly to the corresponding block's start position (from offset) and immediately refocuses the editor so you can continue typing without friction.
- **🔄 Structural Scope Fingerprint Engine [v2.3.3]:** Features a unique structural fingerprinting mechanism (type-from-to string aggregation) that completely eliminates stale display data. Moving your cursor between complex parent blocks and deeply nested child functions (like an IIFE structure) triggers an instantaneous path update.
- **🔍 Long-Press Code Preview & Theme-Adaptive Highlights [v2.2.2+]:** Long-pressing any breadcrumb item triggers a high-definition code snippet preview popup strictly anchored beneath the navigation bar. It is powered by a robust luminance-aware engine that automatically matches your active editor theme (Dark/Light) to prevent unreadable token colors.
- **📐 Native Mobile Touch Resizing [v2.3.3]:** Engineered with a native touchscreen drag gesture handle at the bottom corner of the preview popup. Users can dynamically scale the preview window height and width smoothly, bypassing mobile layout limitations.
- **⚡ Pure Method Chaining Awareness:** Isolates precise method names inside chains (e.g., extracts just filter, map, or reduce instead of the whole functional block) and tracks down the original caller identifier (e.g., usersList.filter).
- **🛡️ Smart JSX Event Handler Filtering:** Intelligently detects and filters out inline arrow function parameters inside JSX attributes (e.g., avoids rendering trailing event arguments like > e from onClick={(e) => {}}), keeping component paths completely clean.
- **🟢 Granular Variable Tracking:** Full tracking awareness for standard localized variable definitions (const, let, var), mapping them down carefully within nested blocks.
- **🔒 Smart Environment Filter:** Automatically activates within JavaScript, JSX, TypeScript, and TSX configurations, while keeping itself cleanly hidden inside plain text, HTML, CSS, or Markdown files.
- **🎨 Premium Thin-Line Icons & Matte Themes [v2.2.1+]:** Packed with lightweight geometric SVG icons (stroke-width="1.3") calibrated for high-resolution mobile AMOLED screens. Built using a premium matte-pastel palette that balances high-contrast accessibility and eye care.

## 🖼️ Preview Image

![Breadcrumbs Preview 1](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview1.png)
![Breadcrumbs Preview 2](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview2.png)
![Breadcrumbs Preview 3](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview3.png)
![Breadcrumbs Preview 4](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview4.png)
![Breadcrumbs Preview 5](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview5.png)
![Popup Preview Screenshot Light](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview_screenshot_light.png)
![Popup Preview Screenshot Dark](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview_screenshot_dark.png)

## 🎨 Icon & Theme Standards Map

| Symbol Type             | UI Icon | Color Palette     | Description / Node Type Match                                           |
| ----------------------- | ------- | ----------------- | ----------------------------------------------------------------------- |
| **Class / Interface**   | 🔲      | #61AFEF / #4EC9B0 | OOP Bracket Frame Boundary & TypeScript Contracts                       |
| **Type Alias / Enum**   | 📄      | #56B6C2 / #98C379 | TS Explicit Types, Enums & Definition Specs                             |
| **Method**              | 📦      | #C792EA           | Soft Lavender Purple / VS-Code Style 3D Method Wireframe & Constructors |
| **Function / Arrow**    | 𝑓 / 🔄  | #61AFEF / #D19A66 | Neon Blue global scopes & Lambda Callbacks / IIFEs                      |
| **Variable / Property** | 🟢 / 🗂️ | #E06C75 / #C3E88D | Local Block-Scoped variables & Object Property keys                     |
| **Method Chain**        | 🍇      | #A371F7           | Deep Violet / Fluid Pipeline Operators (.map, .filter)                  |
| **Looping (for/while)** | 🔄      | #FB923C           | Energetic Tangerine / Loop Control Constructs                           |
| **Conditional**         | 🕒      | #F78C6C           | Soft Coral Orange / Branching Statements (if, switch)                   |
| **Error Handling**      | 🛡️      | #C5A5C5           | Try, Catch, and Finally Diagnostics                                     |
| **JSX Element**         | ⚛️      | #4fc1ff           | Bright Sky React Blue / UI Components & Helix Fragments                 |

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

- **Version:** v2.3.3 (Structural Fingerprinting & Mobile Resizing Release)
- **Language:** TypeScript 5+ (Strict Type Checking)
- **Parser Core:** CodeMirror 6 Lezer JavaScript/TypeScript Dialect Tree
- **Framework Integration:** Acode Extension Lifecycle API
- **Bundler:** Esbuild / Custom lightweight bundling pipelines

## 📄 License

MIT License. Feel free to fork, customize, and extend! Created with 💻 by CodeNoKami.

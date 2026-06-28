# Acode Breadcrumbs Plugin

A smart, high-performance, and **theme-adaptive VS Code-style Breadcrumbs navigation bar** for Acode Editor. It brings desktop-grade code structure visibility and fluid navigation right onto your mobile screen, mapping out your classes, methods, functions, arrays, and objects in real-time using a powerful Hybrid AST Parsing Engine.

## 📸 Previews

### Flawless Nested Scope Tracking & Dynamic Methods

Active scope representation mapping smoothly from Classes to Methods, Array Operations, and Literals directly:

```
Symbols › 📦 DatabaseService › 📦 constructor
Symbols › 🍇 usersList.filter › 🔄 anonymous

```

### TypeScript Type & Data Awareness

Clean UI feedback for advanced TS definitions, Type annotations, Arrays, Variables, and nested Configurations:

```
Symbols › 📄 UserRole › 🟢 config_list › 🗂️ properties

```

## ✨ Features

- **🎯 Interactive Code Navigation [v2.2.0+]:** Every scope element rendered on the bar is now **fully clickable**. Clicking a scope path item will instantly jump your editor cursor directly to the corresponding block's start position (from offset) and immediately refocus the editor so you can continue typing without friction.
- **🔍 Long-Press Code Preview & Theme-Adaptive Highlights [v2.2.2]:** Long-pressing any breadcrumb item triggers a high-definition code snippet preview popup strictly anchored beneath the navigation bar. It is powered by a robust luminance-aware engine that automatically toggles between a premium Matte Dark Palette (One-Dark/Dracula hybrid) and a clean Light Palette (GitHub-Light) depending on your active editor theme to prevent raw, unreadable token colors.
- **✨ Dynamic Contextual Visual Feedback [v2.2.2]:** When a long-press is confirmed, the targeted scope item instantly draws a dynamic text underline matching that specific block type's identity color (getColorByType). The underline is automatically cleared once the popup is dismissed, delivering a flawless, high-tier native application feel.
- **🚀 Hybrid Parsing Engine (AST + Lookback):** Combines the mechanical accuracy of CodeMirror's Lezer AST parser with an intelligent lookback text-slicing engine, making scope detection bulletproof against syntax variations.
- **⚡ Pure Method Chaining Awareness:** No generic or messy code blocks in your bar. It safely isolates precise method names inside chains (e.g., extracts just filter, map, or reduce instead of the whole functional block) and intelligently tracks down the original caller identifier (e.g., usersList.filter).
- **🟢 Granular Variable Tracking:** Full tracking awareness for standard localized variable definitions (const, let, var), mapping them down carefully within nested blocks.
- **🛡️ Smart JSX Event Handler Filtering:** Intelligently detects and filters out inline arrow function parameters inside JSX attributes (e.g., avoids rendering trailing event arguments like > e from onClick={(e) => {}}), keeping deep JSX element component paths perfectly clean.
- **🔒 Smart Environment Filter:** Automatically wakes up within JavaScript, JSX, TypeScript, and TSX configurations, while keeping itself cleanly hidden inside plain text, HTML, CSS, or Markdown files.
- **🎨 Premium Thin-Line Icons & Matte Themes [v2.2.1+]:** Packed with modern, lightweight geometric SVG icons (stroke-width="1.3") calibrated for high-resolution mobile AMOLED screens. Built using a premium matte-pastel palette that balances high-contrast accessibility and eye care.

## 🖼️ Preview Image

![Breadcrumbs Preview 1](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview1.png)
![Breadcrumbs Preview 2](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview2.png)
![Breadcrumbs Preview 3](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview3.png)
![Breadcrumbs Preview 4](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview4.png)
![Breadcrumbs Preview 5](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview5.png)
![Popup Preview Screenshot Light](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview_screenshot_light.png)
![Popup Preview Screenshot Dark](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview_screenshot_dark.png)

## 🎨 Icon & Theme Standards Map

| Symbol Type             | UI Icon | Color Palette | Description / Node Type Match                                           |
| ----------------------- | ------- | ------------- | ----------------------------------------------------------------------- |
| **Class / Interface**   | 🔲      | #FFCB6B       | Warm Amber Gold / OOP Bracket Frame Boundary                            |
| **Type Alias / Enum**   | 📄      | #00E5FF       | Electric Cyan / TS Explicit Types & Definition Specs                    |
| **Method**              | 📦      | #C792EA       | Soft Lavender Purple / VS-Code Style 3D Method Wireframe & Constructors |
| **Function**            | 𝑓       | #82B1FF       | Neon Soft Blue / Math Curvature f(x) Global Functions                   |
| **Arrow / Callback**    | 🔄      | #4ECC97       | Mint Fresh Green / Lambda Expressions & "anonymous" Callback Fallbacks  |
| **Variable**            | 🟢      | #7EE787       | Fresh Leaf Green / Block-Scoped Local Variables                         |
| **Method Chain**        | 🍇      | #A371F7       | Elegant Deep Violet / Fluid Pipeline Operators (.map, .filter, .reduce) |
| **Array Expression**    | 🄶       | #FFD54F       | Soft Canary Yellow / Arrays, Seed Data & Tuple Lists                    |
| **Object / Property**   | 🗂️      | #C3E88D       | Pastel Emerald / Structural Object Keys & Property Definitions          |
| **Object Literal**      | 📦      | #A9FFB2       | Pale Sage Green / Root Object Expression Initializations                |
| **Looping (for/while)** | 🔄      | #FB923C       | Energetic Tangerine / For, While, and Do-While Loop Constructs          |
| **Conditional**         | 🕒      | #F78C6C       | Soft Coral Orange / If, Else-If, Else, and Switch Statements            |
| **Static Block**        | 🔒      | #FF5370       | Premium Rose Red / Class Initializer Blocks                             |
| **JSX Element**         | ⚛️      | #80DEEA       | Bright Sky React Blue / UI Components & Helix Fragments                 |
| **Error Handling**      | 🛡️      | #EF4444       | Balanced Safety Red / Try, Catch, and Finally Diagnostics               |

## ⚠️ Caution & Continuous Tuning

> [!NOTE]
> Since this plugin relies closely on **CodeMirror's Lezer AST Node Traversal**, complex code syntax combinations can sometimes result in minor path variations:
>
> - **Multi-level else-if chains:** Deep nesting layouts can occasionally display parent scopes differently depending on code indentation and formatting.
> - **Deeply Nested Inline Arguments:** Intermittent stripping of parent identifiers may occur within heavily nested arrays if mixed with immediate inline callbacks without structural assignment.

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

4.  **Output:** The compiled production-grade ZIP bundle will be generated inside your root project directory, fully compressed and optimized, ready to be imported straight into Acode.

## 🛠️ Tech Stack & Configuration

- **Version:** v2.2.2 (Theme Adaptivity & Long-Press Preview Release)
- **Language:** TypeScript 5+ (Strict Type Checking)
- **Parser Core:** CodeMirror 6 Lezer JavaScript/TypeScript Dialect Tree
- **Framework Integration:** Acode Extension Lifecycle API
- **Bundler:** Esbuild / Custom lightweight bundling pipelines

## 📄 License

MIT License. Feel free to fork, customize, and extend! Created with 💻 by CodeNoKami.

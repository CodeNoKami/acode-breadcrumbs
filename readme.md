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

---

## ✨ Features

- **🎯 Interactive Code Navigation [v2.2.0]:** Every scope element rendered on the bar is now **fully clickable**. Clicking a scope path item will instantly jump your editor cursor directly to the corresponding block's start position (`from` offset) and immediately refocus the editor so you can continue typing without friction.
- **🚀 Hybrid Parsing Engine (AST + Lookback):** Combines the mechanical accuracy of CodeMirror's Lezer AST parser with an intelligent lookback text-slicing engine, making scope detection bulletproof against syntax variations.
- **⚡ Pure Method Chaining Awareness:** No generic or messy code blocks in your bar. It safely isolates precise method names inside chains (e.g., extracts just `filter`, `map`, or `reduce` instead of the whole functional block) and intelligently tracks down the original caller identifier (e.g., `usersList.filter`).
- **🟢 Granular Variable Tracking:** Full tracking awareness for standard localized variable definitions (`const`, `let`, `var`), mapping them down carefully within nested blocks.
- **🛡️ Smart JSX Event Handler Filtering:** Intelligently detects and filters out inline arrow function parameters inside JSX attributes (e.g., avoids rendering trailing event arguments like `> e` from `onClick={(e) => {}}`), keeping deep JSX element component paths perfectly clean.
- **🔒 Smart Environment Filter:** Automatically wakes up within JavaScript, JSX, TypeScript, and TSX configurations, while keeping itself cleanly hidden inside plain text, HTML, CSS, or Markdown files.
- **🎨 Premium Thin-Line Icons & Matte Themes:** Packed with modern, lightweight geometric SVG icons (`stroke-width="1.3"`) crafted specifically for high-resolution mobile AMOLED screens. Colors adjust dynamically to both Light and Dark editor themes using a balanced material palette inspired by high-end desktop IDEs.

---

## 🖼️ Preview Image

![Breadcrumbs Preview 1](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview1.png)
![Breadcrumbs Preview 2](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview2.png)
![Breadcrumbs Preview 3](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview3.png)
![Breadcrumbs Preview 4](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview4.png)
![Breadcrumbs Preview 5](https://raw.githubusercontent.com/CodeNoKami/acode-breadcrumbs/refs/heads/master/src/preview/preview5.png)

## 🎨 Icon & Theme Standards Map

| Symbol Type           | UI Icon | Color Palette | Description / Node Type Match                                            |
| --------------------- | ------- | ------------- | ------------------------------------------------------------------------ |
| **Class / Interface** | 🔲      | `#ffcb6b`     | Warm Amber / OOP Bracket Frame Boundary                                  |
| **Type Alias / Enum** | 📄      | `#00e5ff`     | Electric Cyan / TS Explicit Types & Definition Specs                     |
| **Method**            | 📦      | `#c792ea`     | Soft Lavender Purple / VS-Code Style 3D Method Wireframe & Constructors  |
| **Function**          | 𝑓       | `#82b1ff`     | Neon Soft Blue / Math Curvature f(x) Global Functions                    |
| **Arrow / Callback**  | 🔄      | `#4ecc97`     | Mint Fresh Green / Lambda Expressions & `"anonymous"` Callback Fallbacks |
| **Variable**          | 🟢      | `#7ee787`     | Fresh Ecosystem Leaf Green / Block-Scoped Local Variables                |
| **Method Chain**      | 🍇      | `#a371f7`     | Elegant Deep Violet / Fluid Pipeline Operators (.map, .filter, .reduce)  |
| **Array Expression**  | 🄶       | `#ffd54f`     | Soft Canary Yellow / Arrays, Seed Data & Tuple Lists                     |
| **Object / Property** | 🗂️      | `#c3e88d`     | Pastel Emerald / Structural Object Literals & Map Keys                   |
| **Control Flow**      | 🕒      | `#f78c6c`     | Soft Coral Orange / if-else, loops (for/while), switch, try-catch        |
| **Static Block**      | 🔒      | `#ff5370`     | Premium Rose Red / Class Initializer Blocks                              |
| **JSX Element**       | ⚛️      | `#80deea`     | Bright Sky React Blue / UI Components & Helix Fragments                  |

---

## ⚠️ Caution & Continuous Tuning

> [!NOTE]
> Since this plugin relies closely on **CodeMirror's Lezer AST Node Traversal**, complex code syntax combinations can sometimes result in minor path variations:
>
> - **Multi-level else-if chains:** Deep nesting layouts can occasionally display parent scopes differently depending on code indentation and formatting.
> - **Deeply Nested Inline Arguments:** Intermittent stripping of parent identifiers may occur within heavily nested arrays if mixed with immediate inline callbacks without structural assignment.

---

## 📦 Installation & Build

If you are maintaining this plugin locally or building it from source inside your development environment:

1. **Clone the repository:**

```bash
git clone [https://github.com/CodeNoKami/acode-breadcrumbs.git](https://github.com/CodeNoKami/acode-breadcrumbs.git)
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

- **Version:** v2.2.0 (Interactive Navigation Release)
- **Language:** TypeScript 5+ (Strict Type Checking)
- **Parser Core:** CodeMirror 6 Lezer JavaScript/TypeScript Dialect Tree
- **Framework Integration:** Acode Extension Lifecycle API
- **Bundler:** Esbuild / Custom lightweight bundling pipelines

## 📄 License

MIT License. Feel free to fork, customize, and extend! Created with 💻 by CodeNoKami.

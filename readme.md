# Acode Breadcrumbs

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=10,24,30&height=180&section=header&text=Acode%20Breadcrumbs&fontSize=45&fontColor=fff&animation=twinkling" alt="Acode Breadcrumbs Header" />
</p>

<p align="center">
  <a href="https://github.com/CodeNoKami/acode-breadcrumbs/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/CodeNoKami/acode-breadcrumbs?style=for-the-badge&color=blue" alt="License" />
  </a>
  <a href="https://github.com/CodeNoKami/acode-breadcrumbs/releases">
    <img src="https://img.shields.io/github/v/release/CodeNoKami/acode-breadcrumbs?include_prereleases&style=for-the-badge&color=success" alt="Release" />
  </a>
  <img src="https://img.shields.io/badge/Platform-Acode%20Mobile-blueviolet?style=for-the-badge" alt="Platform" />
</p>

---

A high-performance, theme-adaptive, desktop-grade **VS Code-style Breadcrumbs Navigation Bar** engineered specifically for the Acode Editor.
This plugin brings deep architectural visibility and fluid source code navigation to mobile viewports. Powered by a lightweight, real-time **Lezer AST Parsing Engine**, it dynamically maps structural syntax definitions into an interactive hierarchy directly above your active viewport.

---

## 📸 Previews

### ⚡ Flawless Nested Scope Tracking & Dynamic Methods `[v2.6.0]`

Real-time structural rendering mapping cleanly from the active filename through classes, methods, context blocks, and loops:

```
database.ts › 🔶 DatabaseService › 📦 constructor › 🔄 while
userController.js › 🍇 usersList.filter › 🔶 if
app.tsx › 🔄 iifeModule › 🛡️ try
```

### 💎 TypeScript Type & Data Awareness

Clean UI feedback for advanced TS constraints, Type interfaces, array lists, and variable scopes:

```
types.ts › 📄 UserRole › 🟢 config_list › 🗂️ properties
```

---

## ✨ Features

- **🗂️ VS Code-Parity Path Mapping:** Anchors the active filename as the structural root node before drilling down into the file architecture (`Filename › Scope › Sub-Scope`), matching standard desktop IDE layouts.
- **🎯 Interactive Offset Navigation:** Every segment rendered on the breadcrumbs bar is a fully clickable target. Tap any scope to instantly jump the editor cursor to the corresponding code block offset and focus the viewport.
- **🔄 Balanced Scope Aggregation Engine `[v2.6.0]`:** Intelligently balances syntax accuracy with UX sanity. Traverses the AST tree to expose nested loops, conditionals, and error handling without cluttering the screen or overwhelming your mobile viewport layout.
- **🎨 15-Node High-Contrast Palette Configurator `[v2.6.0]`:** Offers individual Hex text inputs in the settings dashboard for all 15 supported semantic layout structures (including newly added Control Flow blocks).
- **🔍 Luminance-Aware Theme Adaptivity:** Automatically reads the active editor canvas background luminance. It hooks into computed variables to map syntax colors dynamically to custom Light (GitHub-Light inspired) or Matte Dark (One-Dark/Dracula hybrid) standards seamlessly.
- **✨ Acrylic Frosted Glass Overlay:** Employs a hardware-accelerated backdrop blur filter underneath long-press structural code previews for an immersive visual experience.

---

## 🎨 Scope Syntax & Theme Mapping

All vector icons are rendered via optimized 16x16 viewport inline SVGs with standard-compliant line weight balancing.

| Token Scope Type           | Vector Concept | Default Palette | Node Type / Abstract Mapping Context                      |
| :------------------------- | :------------: | :-------------: | :-------------------------------------------------------- |
| **class**                  |       🔲       |    `#FFB834`    | Object-Oriented Blueprint classes & declarations          |
| **interface**              |  🔲 (Dashed)   |    `#46D9FF`    | TypeScript Structural Model Contracts                     |
| **type**                   |       📄       |    `#10E5FA`    | Type Aliases, Union, and Intersection specs               |
| **enum**                   |       📄       |    `#00F5D4`    | Numeric / String Enumeration definitions                  |
| **method**                 |       📦       |    `#D694FF`    | Inside Class Functions & Object Constructors              |
| **function**               |      _𝑓_       |    `#60A5FA`    | Global lexical declarations & functional scopes           |
| **arrow**                  |       🏹       |    `#34D399`    | Lambda Callbacks, Inline Promises & Anonymous expressions |
| **property**               |       🗂️       |    `#99E65F`    | Explicit Key/Value mappings inside JSON or literals       |
| **object**                 |       📦       |    `#6EE7B7`    | Instantiated structural JSON Objects & configurations     |
| **array**                  |       📊       |    `#FCD34D`    | Iterable Array brackets & assignment signatures           |
| **variable**               |       🟢       |    `#4ADE80`    | Local mutable/immutable blocks (let, const, var)          |
| **jsx**                    |       ⚛️       |    `#22D3EE`    | React Components, XML Fragment tags & layout blocks       |
| **conditional** `[v2.6.0]` |       🔶       |    `#d68600`    | Flowchart Decision Nodes (if, else, switch)               |
| **looping** `[v2.6.0]`     |       🔄       |    `#52ff72`    | Cyclic Iteration Nodes (for, while, do-while)             |
| **tcf** `[v2.6.0]`         |       🛡️       |    `#fa3b49`    | Defensive Exception Enclosures (try, catch, finally)      |

---

## 🛠️ Contributor & Architecture Extension Guide

The plugin evaluates structural trees into a single visual state array using a decoupled architectural workflow:

```
[CodeMirror Viewport Change]
│
▼
[lezerParser.ts] ──► Decodes Raw Lezer Tree via Nodes Range
│
▼
[ScopeType Evaluation]
│
▼
[patterns.ts]  ──► Matches Scope Type to Vector Path + Color Token
│
▼
[DOM Representation] (Breadcrumb Bar Updates)
```

<details>
  <summary>📦 Click to view Project Anatomy Details</summary>

### Project Components

- `main.ts`: Orchestrates workspace layout injections, window touch event bindings, long-press gestures, preference caching, and DOM updates.
- `lezerParser.ts`: Evaluates active syntax trees. Contains specific language rules determining if an active tree offset falls under structural declaration categories or helper blocks.
- `patterns.ts`: Defines the UI/UX components. Holds type structures, default premium styling dictionaries, and custom SVG paths.
</details>

### Adding New Language Tokens

To register and implement a new syntax block mapping (e.g., adding a database query tag or markdown scope):

1. **Extend the Type Base:** Open `patterns.ts` and append your target key string identifier into the `ScopeType` union:

```typescript
export type ScopeType = "class" | "function" | "yourNewToken";
```

2. **Assign Core Identity Colors:** Update the fallback color configuration map (DEFAULT_BREADCRUMBS_COLORS):

```typescript
export const DEFAULT_BREADCRUMBS_COLORS: Record<string, string> = {
  yourNewToken: "#FF5555", // Modern Red Accent
};
```

3.  **Draft the UI Vector Path:** In getIconByType(), append a case block defining your custom vector inside the 16x16 frame setup:

```typescript
case "yourNewToken":
  return `<svg ${svgStyle}><path d="M2 2h12v12H2z"/></svg>`;

```

4.  **Hook Into the Parsing Stream:** Update lezerParser.ts to identify the syntax tag name delivered by the underlying language package dialect.

## 📦 Compilation & Build Pipeline

Ensure you have **Node.js** installed inside your development setup.

```bash
# 1. Clone the Repository
git clone https://github.com/CodeNoKami/acode-breadcrumbs.git
cd acode-breadcrumbs

# 2. Initialize Dependencies
npm install

# 3. Execute Production Bundling
npm run build

```

> 💡 **Deployment Note:** The pipeline leverages Esbuild to resolve TypeScript modules, outputting a lightweight production ZIP archive to your root workspace folder. Import this package directly into Acode's local plugin manager.

## 📄 Core Technical Stack

- **Engine Target:** TypeScript 5.x+ Execution Core
- **Parsing Backend:** CodeMirror 6 Lezer Syntactic Traversal Tree
- **Platform Target:** Acode Mobile Extensibility Ecosystem
- **License Model:** Open-source MIT Certification Rules.
<p align="center">Created with 💻 by <b>CodeNoKami</b></p>

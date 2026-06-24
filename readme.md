# Acode Breadcrumbs Plugin 🎬🍿

A smart, high-performance, and **theme-adaptive VS Code-style Breadcrumbs navigation bar** for Acode Editor. It brings desktop-grade code structure visibility right onto your mobile screen, mapping out your classes, methods, and functions in real-time.

---

## ✨ Features

- **Visual Indentation Stack Engine:** Flawless scope tracking based on visual indent hierarchy, preventing brackets collisions from strings, comments, or regex blocks.
- **Instant Cursor Reactivity:** Zero lag. Powered by reactive state tracking, updates paths instantaneously upon a single click or selection change.
- **Smart Language Filter:** Only activates on JavaScript, JSX, TypeScript, and TSX files. Automatically hides itself inside plain texts, HTML, CSS, etc.
- **TypeScript & Modern JS Aware:** Full support for complex modern JS/TS syntaxes including Explicit Return Type Annotations (`: void`, `: Promise<any>`), `async/await`, `static`, access modifiers (`public`, `private`), generators (`*`), arrow functions, nested callbacks, object literals, and event listeners.
- **Theme Adaptive UI:** No contrast loss. Colors adjust dynamically to both Light and Dark editor themes. Includes beautifully aligned inline SVG icons matching VS Code color standards.

---

## 🎨 Icon Standards Map

| Symbol Type           | Icon Theme | Color Code | Description                                 |
| :-------------------- | :--------: | :--------: | :------------------------------------------ |
| **Class / Interface** |    `{}`    | `#f1c40f`  | Yellow Class Brackets Box                   |
| **Method**            |     📦     | `#9b59b6`  | Purple Method Block                         |
| **Function**          |    `ƒ`     | `#3498db`  | Blue Named Function                         |
| **Arrow / Callbacks** |    `=>`    | `#1abc9c`  | Teal Variable Function / `.map`, `.forEach` |
| **Object / Property** |     ☰     | `#1abc9c`  | Teal Block / Object Literal Declarations    |
| **Event Listener**    |     ⚡     | `#e84393`  | Pink Lightning Event Tracker                |
| **TS Type Alias**     |    `T`     | `#e67e22`  | Orange TypeScript Type Badge                |

---

## 📦 Installation & Build

If you are maintaining this plugin locally or building it from source inside your environment:

1. **Clone the repository:**

```bash
git clone https://github.com/CodeNoKami/acode-breadcrumbs.git
cd acode-breadcrumbs
```

2. **Install dependencies:**

```bash
npm install
```

3.  **Compile and Bundle:**

```bash
npm run build

```

4.  **Output:** The compiled production-grade bundle `dist.zip` will be exported inside your project directory, ready to be imported into Acode.

## 🛠️ Tech Stack & Configuration

- **Language:** TypeScript 5+ (Strict Mode Compilation)
- **Framework integration:** CodeMirror 6 State Handling Architecture & Acode Extension API
- **Bundler:** Esbuild / Custom configuration bundle pipelines

## 📄 License

MIT License. Feel free to fork, customize, and extend! Created with ♥️ by Lumen.

# Acode Breadcrumbs Plugin 🎬🍿

A smart, high-performance, and **theme-adaptive VS Code-style Breadcrumbs navigation bar** for Acode Editor. It brings desktop-grade code structure visibility right onto your mobile screen, mapping out your classes, methods, and functions in real-time.

---

## ✨ Features

- **Visual Indentation Stack Engine:** Flawless scope tracking based on visual indent hierarchy, preventing brackets collisions from strings, comments, or regex blocks.
- **Instant Cursor Reactivity:** Zero lag. Powered by reactive state tracking, updates paths instantaneously upon a single click or selection change.
- **Smart Language Filter:** Only activates on JavaScript, JSX, TypeScript, and TSX files. Automatically hides itself inside plain texts, HTML, CSS, etc.
- **Production-Grade Regex Patterns:** Complete support for complex modern JS/TS syntaxes: `async/await`, `static`, modifiers (`public`, `private`), generators (`*`), arrow functions, nested callbacks, and explicit object keys.
- **Theme Adaptive UI:** No contrast loss. Colors adjust dynamically to both Light and Dark editor themes. Includes beautifully aligned inline SVG icons matching VS Code color standards.

---

## 🎨 Icon Standards Map

| Symbol Type           | Icon Theme | Color Code | Description                                 |
| :-------------------- | :--------: | :--------: | :------------------------------------------ |
| **Class / Interface** |    `{}`    | `#f1c40f`  | Yellow Class Marker                         |
| **Method**            |     📦     | `#9b59b6`  | Purple Method Block                         |
| **Function**          |    `ƒ`     | `#3498db`  | Blue Named Function                         |
| **Arrow / Callbacks** |    `=>`    | `#1abc9c`  | Teal Variable Function / `.map`, `.forEach` |
| **Object Key**        |     ☰     | `#1abc9c`  | Teal Block Properties                       |

---

## 📦 Installation & Build

If you are maintaining this plugin locally or building it from source inside your environment:

1. **Clone and Install dependencies:**
   ```bash
   npm install
   ```

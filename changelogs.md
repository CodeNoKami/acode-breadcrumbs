# Changelog

All notable changes to this project will be documented in this file. This project adheres to Semantic Versioning.

## [2.2.2] - 2026-06-28

### 🎨 Theme Adaptivity & Premium UX Enhancements

- **Rock-Solid Dark/Light Adaptive Highlights:** Integrated an intelligent luminance detection engine that analyzes the active editor background. Automatically maps tokens to a premium Matte Dark Palette (One-Dark/Dracula hybrid) or a clean Light Palette (GitHub-Light inspired), ensuring bulletproof syntax highlighting across all custom editor themes.
- **Dynamic Contextual Visual Feedback:** Upgraded the long-press preview interaction loop. Activating a code preview now instantly applies a rich text underline styled exactly to that block type's individual identity color (getColorByType), which smoothly resets to default upon preview dismissal.
- **Resilient Style Mimicry Fallbacks:** Refactored popup generation to pull real-time computed background and text colors directly from the live CodeMirror viewport (.cm-scroller), preventing invisible text rendering on transparent or highly customized interface setups.

### ⚡ Performance Optimization & Rendering Refactor

- **Debounced Event Throttling:** Integrated a high-performance queueUpdate mechanism with a 45ms window across selectionchange, focusin, and click triggers. This effectively eliminates typing stutter and heavy AST recalculations during rapid typing bursts on mobile CPUs.
- **Isolated Path Sub-Targeting:** Refactored the DOM layout engine by introducing a dedicated pathContainer wrapper. Static elements (like the leading "Breadcrumbs ›" title and chevron icons) are now generated only once during setup, drastically lowering layout paint overhead.
- **Hardened Tab Context Migrations:** Resolved a hidden memory leak inside the onFileSwitched lifecycle. Regional editor focus listeners are now systematically unbound from old DOM nodes before binding onto the fresh active workspace tab.

## [2.2.1] - 2026-06-28

### 🎨 UI & Icon Design Corrections

- **Fixed While Loop Icon Alignment:** Resolved an issue where the while, for, and do control flow structures rendered an unaligned refresh/undo symbol. Replaced it with a centered, clockwise thin-line infinite loop vector.
- **Fixed Arrow Function Icon Orientation:** Corrected the orientation of the lambda expression arrow (=>). It now cleanly points to the right rather than rendering as an inverted bottom-left return hook.
- **Unified Sub-Scope Mappings:** Ensured child-scoped tokens like for, do, while and arrow callback scopes automatically adapt the corrected parent vector tracks.

### 👁️ Palette Calibration & Eye Care Optimization

- **High-Contrast Separation:** Redesigned the color scheme based on desktop IDE standards to eradicate overlapping tones and maximize accessibility in dark/AMOLED runtime environments.
- **Distinct Control Flows:** Separated Looping structures (**Vivid Tangerine Orange** - #FB923C) from Conditional blocks (**Soft Coral Orange** - #F78C6C).
- **Enhanced Functional Clarity:** Differentiated standard class Methods (**Soft Lavender Purple** - #C792EA) from pipeline Method Chains (**Deep Violet** - #A371F7).
- **Refined Data Structure Indicators:** Isolated structural Object scopes (**Pale Sage Green** - #A9FFB2) from individual Property tokens (**Pastel Emerald** - #C3E88D).

### 🛠️ Code Quality & Architecture Documentation

- **Comprehensive JSDoc Integration:** Added formal standard documentation headers to core utilities (lezerParser.ts, patterns.ts) and the orchestration file (main.ts).
- **Contributor-Friendly Codebase:** Injected descriptive English technical logic commentary alongside abstract AST traversal conditions, simplifying community extension and open-source contribution workflows without impacting performance.
- **AST Scaffolding Resilience:** Hardened internal node lookup edge-cases, ensuring safe state evaluation during heavy document repaints or horizontal text selection transitions.

## [2.2.0]

### Added

- Initial experimental integration of the Lezer-based Abstract Syntax Tree (AST) parser engine.
- Added real-time tracking bar wrapper above active CodeMirror viewport containers.
- Support for basic token layout isolation (class, function, variable).

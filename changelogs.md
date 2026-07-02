## [2.6.0] - 2026-07-02

### Added

- **Control-Flow AST Restoration & Re-Engineering:** Re-introduced granular execution-path tracking within the Lezer AST parsing pipeline (`lezerParser.ts` and `main.ts`) after the structural optimization pass in v2.4.0. It now natively resolves three new core architectural tokens:
  - `conditional`: Isolates logical branching boundaries (`if`, `else`, `switch`).
  - `looping`: Tracks cyclic statements (`for`, `while`, `do-while`).
  - `tcf`: Explicitly maps defensive exception-handling wrappers (`try`, `catch`, `finally`).
- **Premium Semantic Vector Iconography Suite:** Injected custom-tailored 16x16 vector SVG paths within `patterns.ts` designed with balanced geometric stroke configurations to offer immediate visual context:
  - Flowchart Decision Diamond for conditionals.
  - Clockwise Iteration Progress Arc for looping nodes.
  - High-fidelity Defensive Shield for try-catch-finally safeguards.

### Changed

- **Balanced Scope Aggregation Engine:** Refactored the AST traversal depth mechanics to prevent the layout clutter that motivated the v2.4.0 cleanup. Control-flow scopes are now dynamically compressed and evaluated contextually, providing deep code structural insights while maintaining a pristine, distraction-free desktop-grade workspace footprint.

## [2.7.1](https://github.com/CodeNoKami/acode-breadcrumbs/compare/breadcrumbs-plugin-v2.7.0...breadcrumbs-plugin-v2.7.1) (2026-07-02)


### Bug Fixes

* remove unnecessary console.log(scopes) ([b77c49e](https://github.com/CodeNoKami/acode-breadcrumbs/commit/b77c49e151071030099a958a3f2c663fc3a25875))

## [2.7.0](https://github.com/CodeNoKami/acode-breadcrumbs/compare/breadcrumbs-plugin-v2.6.2...breadcrumbs-plugin-v2.7.0) (2026-07-02)


### Features

* upgrade anonymous scope mapping and filter jsx event handlers (v2.1.0) ([dfb005d](https://github.com/CodeNoKami/acode-breadcrumbs/commit/dfb005d02def47260905df79d53ccbc8a12a4e08))


### Bug Fixes

* fixed some errors in capturing scopes. ([898e539](https://github.com/CodeNoKami/acode-breadcrumbs/commit/898e5395f9ef3ee9472c7783a8784e3e05ed05cd))

## [2.5.0] - 2026-07-01

### Added

- **Core UI & Behavioral Toggles:** Integrated explicit user controls within the settings registry to customize core interactions:
  - showIcons: Globally toggles structural layout icons on/off across both the breadcrumbs bar and preview popups.
  - disablePreviewPopup: Allows users to completely disable the long-press preview card behavior for a lighter footprint.
- **Performance & Interaction Calibration:** Added granular drop-down selection options to fine-tune the plugin's orchestration engine:
  - previewDelay: Configurable long-press holding thresholds (300ms, 480ms, 800ms) to control popup responsiveness.
  - pollingDebounceTimeout: Tailorable AST parsing debounce windows (ranging from 100ms for aggressive updating up to 400ms for battery-saving/low-end devices).
- **Full 12-Node Color Configuration Suite:** Expanded the plugin preferences panel with dedicated hex-color text inputs for all primary architectural tokens (Class, Interface, Type, Enum, Method, Function, Arrow, Property, Object, Array, Variable, and JSX).
- **Automated Hex Formatting Sanitizer:** Enhanced the configuration registry save callback to automatically format input strings, appending the missing # prefix to raw hexadecimal inputs to ensure bulletproof CSS evaluation.

### Fixed

- **Desynced Vector vs. Typography Color Palettes:** Refactored the internal getIconByType engine signature to cleanly inherit user-defined theme overrides. This resolves the synchronization issue where changing a node type's text color left its accompanying SVG icon hardcoded to the default purple (#D694FF) tone.
- **Stale Cache Setting Repaint Lock:** Introduced a dedicated clearCache() pipeline to seamlessly flush structural layout fingerprint caches upon changing any setting, forcing an immediate and responsive UI repaint without requiring a workspace or file reload.

## [2.4.0] - 2026-06-29

### Changed

- **VSCode-Parity Architectural Mapping:** Refactored the structural path sequence to anchor strictly onto the `Filename › Scope › Sub-Scope` layout. The breadcrumbs bar now appends the active filename as the root node before drilling down into the code's structural tree, mirroring desktop VSCode's exact navigation format.

### Removed

- **Control-Flow & Loop Scope Filtering:** Stripped out all low-level control-flow nodes (including `if`, `for`, `while`, `do-while`, and `switch` blocks) from the Lezer AST resolution pipeline. By exclusively tracking high-level declarations (such as Classes, Functions, and Methods), this completely eliminates layout clutter and delivers a clean, distraction-free architectural outline.

## [2.3.3] - 2026-06-28

### Added

- **Native Mobile Touch Resizing:** Engineered a specialized touch gesture drag-to-resize corner handle, ensuring fluid window layout customization on mobile touchscreens where native desktop CSS resize properties are unsupported.

### Fixed

- **Nested Scope Bypass:** Replaced the brittle leaf-node range validation with a robust **Structural Scope Fingerprint Engine** (`type-from-to` string aggregation). This eliminates the false-positive caching bug where the breadcrumbs bar failed to refresh when crossing boundaries between parent modules and deeply nested anonymous scopes.
- **Ghost Event Listener Memory Leak:** Implemented a definitive `activePopupCleanup` closure layer to systematically unbind global document touch and mouse event listeners upon preview dismissal, preventing compound memory overhead.
- **Long-Press Event Collision:** Integrated a `blockClickBypass` safety flag to neutralize accidental cursor jumping or document selection triggers immediately following the release of long-press preview interactions.

### Performance

- **Optimized Fingerprint Caching Guard:** Leveraged the structural fingerprint mechanism to safely short-circuit and bypass the entire DOM reconstruction pipeline _only_ when both the raw document content and the active scope hierarchy remain entirely identical.
- **CPU-Friendly Debounce Throttle:** Scaled the internal event polling debounce timeout from 45ms to a balanced 150ms window, significantly eliminating background typing stutters and reducing mobile CPU thermal throttling under heavy document repaints.

## [2.2.3] - 2026-06-28

### Added

- Introduced a premium **Acrylic Style (Frosted Glass) Backdrop Blur** UI effect for the preview popup.

### Fixed

- Resolved top-level syntax parsing errors for standalone class methods and properties in the preview by implementing a **Dynamic Class Wrapper** injection mechanism.
- Upgraded code syntax token palettes to One Dark Pro (Dark) and GitHub Light (Light) standards for enhanced contrast and visibility across themes.

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

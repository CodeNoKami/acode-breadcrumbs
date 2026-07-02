# Git Commit Message Guidelines

To keep our commit history clean, readable, and compatible with automated changelog generation, all contributors are required to follow these commit message guidelines when contributing to this plugin.

## Commit Message Format

Commit messages must follow this structure:

```
<type>: <short, imperative description>
```

_Example: `feat: add dark mode support` or `fix: resolve plugin crash on startup`_

---

## Commit Types (`<type>`)

Depending on the nature of your changes, you must choose one of the following types:

| Type         | Description                                                                                         |
| :----------- | :-------------------------------------------------------------------------------------------------- |
| **feat**     | Introducing a new feature                                                                           |
| **fix**      | Fixing a bug                                                                                        |
| **docs**     | Documentation changes only (e.g., README, Wiki)                                                     |
| **style**    | Changes that do not affect the meaning of the code (formatting, spacing, missing semi-colons, etc.) |
| **refactor** | A code change that neither fixes a bug nor adds a feature (restructuring code)                      |
| **perf**     | A code change that improves performance                                                             |
| **test**     | Adding missing tests or correcting existing tests                                                   |
| **build**    | Changes that affect the build system (e.g., Webpack, Vite, Gulp configuration)                      |
| **ci**       | Changes to our CI/CD configuration files and scripts (e.g., GitHub Actions)                         |
| **chore**    | Other changes that don't modify src or test files (dependency updates, config file tweaks)          |
| **revert**   | Reverting a previous commit                                                                         |

---

## Good Examples

- `feat: add auto-save functionality for plugin settings`
- `fix: resolve memory leak on file close`
- `docs: update installation steps in README`
- `style: fix indentation and remove trailing spaces`
- `refactor: simplify code structure in editor component`

## Rules to Remember

1. **Lower case:** The `<type>` must always be in lowercase. (e.g., Use `feat:`, not `Feat:` or `FEAT:`)
2. **Imperative tone:** Write the description in the imperative mood (e.g., use `add` instead of `added` or `adds`). Think of it as giving a command to the codebase.
3. **Short and Clear:** Keep the commit title brief and concise. If you need to add more details, leave a blank line after the title and write a detailed description in the commit body.

Thank you for following these guidelines and helping us maintain a high-quality project history!

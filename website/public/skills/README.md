# Babylon.js Editor — Skills

This directory contains [Agent Skills](https://docs.claude.com/en/docs/claude-code/skills) describing how to work
with the **`babylonjs-editor-tools`** runtime package that ships inside every project exported/packaged by the
Babylon.js Editor.

Each skill is a self-contained folder with a `SKILL.md` (loaded on demand by its `description`) and optional
`references/` files that are read only when a given sub-topic is needed.

## Available skills

| Skill | Use it when you need to… |
| --- | --- |
| [`babylonjs-editor-tools`](./babylonjs-editor-tools/SKILL.md) | Write/attach scripts, load scenes, and use the editor decorators (`@nodeFromScene`, `@visibleAs*`, `@onPointerEvent`, `@sceneAsset`, …) in a project created with the Babylon.js Editor. |

## Source of truth

These skills are distilled from:

- The runtime package source: `tools/src/**` (`babylonjs-editor-tools`).
- The official documentation: <https://editor.babylonjs.com/documentation>.
- The starter templates: `templates/*/src/{App,scripts}.ts`.

When the package API changes, update the relevant `references/*.md` file alongside the code.

# Babylon.js Editor — Skills

This directory contains [Agent Skills](https://docs.claude.com/en/docs/claude-code/skills) describing how to work
with the **`babylonjs-editor-tools`** runtime package that ships inside every project exported/packaged by the
Babylon.js Editor.

Each skill is a self-contained folder with a `SKILL.md` (loaded on demand by its `description`) and optional
`references/` files that are read only when a given sub-topic is needed.

## Available skills

| Skill | Use it when you need to… |
| --- | --- |
| [`babylonjs-editor-tools`](./babylonjs-editor-tools/SKILL.md) | Write/attach scripts, load scenes, use the editor decorators (`@nodeFromScene`, `@visibleAs*`, `@onPointerEvent`, `@sceneAsset`, …) and the runtime helpers (scripts lookup, cinematics, sprites, sounds, post-processes, ragdolls, navmeshes, decals, terrains: heights, normals and texture layers, offline database) in a project created with the Babylon.js Editor. |

## Source of truth

These skills are distilled from:

- The runtime package source: `tools/src/**` (`babylonjs-editor-tools`).
- The official documentation: <https://editor.babylonjs.com/documentation>.
- The starter templates: `templates/*/src/{App,scripts}.ts`.

When the package API changes, update the relevant `references/*.md` file alongside the code.

## Used by the editor's AI assistant

The editor bundles these skills (`editor/esbuild.mjs` builds them into `editor/build/assistant/plugin`) and gives
them to the agent of its AI assistant: Claude Code loads them for the session with `--plugin-dir`, Codex gets them
copied in the `.agents/skills` folder of the project (updated with the editor, unless the user modified them), and
Antigravity CLI gets them in the plugin the assistant writes among the user's plugins while it runs. Changes here reach
the assistant with the next build of the editor.

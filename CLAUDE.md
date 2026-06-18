# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

Babylon.js Editor 5 — a desktop (Electron) application for creating and editing 3D scenes with the Babylon.js engine. This is a **yarn classic workspaces monorepo**. The workspaces are:

- `editor/` — `babylonjs-editor`: the Electron app (main process + React renderer). Also publishes a public API (`editor/src/export.ts`) consumed by plugins/scripts.
- `tools/` — `babylonjs-editor-tools`: a runtime library bundled into exported/packaged projects (scene loading, decorators, rendering pipelines, cinematic system). This is what user game code (`src/scripts.ts` etc.) imports.
- `cli/` — `babylonjs-editor-cli`: command-line tool used to pack/export a project's assets, geometries, scenes and scripts, plus S3 upload helpers.
- `mcp/` — `babylonjs-editor-mcp-server`: MCP server exposing editor scene-composition capabilities to AI agents (see `mcp/specifications.md` for the product/feature spec).
- `plugins/` — editor marketplace plugins (`quixel`, `fab`).
- `templates/` — project templates scaffolded for new user projects: `nextjs`, `nuxtjs`, `solidjs`, `vanillajs`, `electron`.
- `website/` — Next.js marketing + documentation site (editor.babylonjs.com).

The `@babylonjs/*` / `babylonjs-*` engine packages are pinned via the root `resolutions` field (currently `9.9.1`) — keep these in sync if bumping the engine version.

## Common commands

Install once at the root (yarn classic):
```bash
yarn install
```

### Build
```bash
yarn build              # tools -> cli -> mcp-server -> editor -> plugins (sequential, dependency order)
yarn build-all          # build + templates + website
yarn build-all-concurrently
yarn build-editor / build-tools / build-cli / build-mcp-server / build-plugins / build-templates / build-website
```

### Run / develop
```bash
yarn start                 # launches the Electron editor (babylonjs-editor)
yarn watch-editor-all       # tsc + esbuild + tailwind watch for the editor
yarn watch-tools / watch-cli / watch-mcp-server / watch-plugins
```
In VS Code, `Cmd/Ctrl+Shift+B` → `watch-all-editor` runs all watchers concurrently (editor, tools, plugins, cli, mcp-server). When changing `tools/`, `cli/`, or `mcp/`, run their watcher alongside the editor's so the editor picks up the rebuilt dependency.

### Lint & format
```bash
yarn format / yarn format-check     # prettier (tabs, double quotes, printWidth 180, trailing comma "es5")
yarn lint                           # format-check + eslint across editor, tools, cli, mcp-server, plugins, templates, website
yarn lint-fix                       # format + eslint --fix across all of the above
yarn lint-editor / lint-tools / lint-cli / lint-mcp-server / lint-plugins / lint-templates / lint-website
```
ESLint config is the flat config at `eslint.config.mjs` plus the custom rule `.eslint/eslint-rules/require-return-type-on-class-methods.mjs` (every class method needs an explicit return type). `editor/src/ui/shadcn/**` and template `scripts.ts` files are excluded from linting.

### Tests
Tests use vitest, per-workspace:
```bash
yarn test                                                  # tools tests then editor tests
yarn coverage                                              # same, with coverage
yarn workspace babylonjs-editor-tools test                 # tools/test/**/*.test.ts
yarn workspace babylonjs-editor test                       # editor/test/**/*.test.mts
```
To run a single test file, `cd` into the workspace and call vitest directly, e.g.:
```bash
cd tools && yarn vitest run test/tools/scene.test.ts
cd editor && yarn vitest run test/tools/node/clone.test.mts
```
`cli/` and `mcp/` currently have no test scripts.

### Packaging
```bash
yarn package --noSign [--x64] [--arm64]   # full pipeline: clean, install, lint, build-all-concurrently, test, then build.mjs (electron-builder)
```
Packaging is platform-bound: macOS builds must run on macOS, Windows builds on Windows (native deps, code signing). macOS signing/notarization needs `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` in a root `.env`.

## Architecture

### Electron app (`editor/`)
- `editor/src/index.ts` — Electron **main process** entry point. Manages the dashboard window vs. per-project editor windows (`editorWindows`), app menu setup, IPC routing (`ipcMain`), auto-update, and registers the `babylonjs-editor://` protocol. Side-effect imports wire up IPC handlers: `electron/node-pty`, `electron/events/{shell,dialog,editor,window,export}`, `electron/assimp/assimpjs`, `electron/protocol`, `electron/oauth`.
- `editor/src/dashboard/` — the project-picker/dashboard window (renderer + its own preload/menu).
- `editor/src/editor/main.tsx` — the `Editor` React component, the **renderer** root for a project window. Holds top-level state (compressed-texture settings, opened tabs, plugin list) and reacts to IPC events (`save`, `editor:open`, `editor:run-project`, undo/redo, etc.).
- `editor/src/editor/layout.tsx` — `EditorLayout`, a `flexlayout-react` model (`layout.json` is the default panel layout). Owns refs to the main panels: `EditorGraph` (scene tree), `EditorPreview` (3D viewport), `EditorInspector`, `EditorAssetsBrowser`, `EditorAnimation`, `EditorConsole`, `EditorMarketplaceBrowser`. Layout is persisted to `localStorage` and versioned via `_layoutVersion`.
- `editor/src/editor/windows/{ge,nme,npe,scene}` — separate Electron windows for the Babylon.js Geometry/Node Material/Node Particle editors.
- `editor/src/electron/` — main-process integrations: node-pty terminal, native dialogs, assimp (model conversion) worker, OAuth, custom protocol handler.
- `editor/src/project/` — project persistence pipeline:
  - `project/save/` and `project/load/` — serialize/deserialize the `.bjseditor` project and `.scene` assets (scenes, decals, textures).
  - `project/export/` — "Generate"/export pipeline (assets, KTX/KTX2 compression, LODs, materials, particles, physics, scripts).
  - `project/configuration.ts` — global `projectConfiguration` singleton + `onProjectConfigurationChangedObservable`.
  - `project/typings.ts` — `IEditorProject` shape and project-level enums (compressed texture software/quality, package manager).
- `editor/src/loader/` — runtime loaders used by the editor preview (mesh, material, texture, animation, node, assimp).
- `editor/src/tools/` — editor-internal utilities grouped by domain (`scene`, `mesh`, `material`, `node`, `light`, `particles`, `physics`, `animation`, `recast` (navmesh), `plugins`, `workers`, `guards`, `maths`).
- `editor/src/mcp/` — in-editor side of MCP integration (actions the MCP server can invoke, scene hierarchy queries).
- `editor/src/export.ts` — the **public API surface** re-exported as the `babylonjs-editor` package (used by the `plugins/` workspaces and potentially user scripts). When adding something plugins/scripts should consume, export it here.

### Runtime library (`tools/`)
`babylonjs-editor-tools` ships inside exported/packaged projects (it's what `templates/*/src/scripts.ts` import). Key areas:
- `loading/` — scene/container/material/light/etc. loaders that reconstruct what the editor saved, including the IndexedDB-backed asset `database/`.
- `decorators/` — `@nodeFromScene`, `@visibleInInspector`-style decorators (`scene.ts`, `gui.ts`, `inspector.ts`, `events.ts`, `particle-systems.ts`, `sound.ts`, `sprite.ts`) used in user scripts; `decorators/apply.ts` applies decorated metadata at runtime.
- `rendering/` — post-process / rendering pipelines (SSR, SSAO, VLS, motion blur, TAA, default pipeline) shared between editor preview and exported game.
- `cinematic/` — the cinematic/sequencer system (parsing, generation, events like `apply-impulse`/`set-enabled`).
- `script.ts` — defines `IScript` (`onStart`/`onUpdate`/`onStop`), the contract every attached user script implements.

### CLI (`cli/`)
`babylonjs-editor-cli` (`bin/babylonjs-editor-cli.js`, built from `src/index.mts`) is a `commander`-based tool. Main subsystem is `pack/`:
- `pack/pack.mts` — orchestrates packing a project for deployment.
- `pack/scene.mts`, `pack/geometry.mts`, `pack/scripts.mts` — pack scenes, merge/export geometries, bundle scripts.
- `pack/assets/` — per-asset-type processing (textures, KTX/KTX2 compression, materials, particle systems) plus `collect.mts`/`process.mts` orchestration.
- `s3/s3.mts` — uploads packed output to S3-compatible storage.
- `tools/workers/md5.mts` + `tools/worker.mts` — worker-thread helpers for hashing/processing.

### MCP server (`mcp/`)
`babylonjs-editor-mcp-server` (`src/index.mts`, request handling in `src/request.mts`) is a Model Context Protocol server that lets AI agents drive the editor: compose scenes from natural language, manage instances vs. clones for performance, write/attach TypeScript scripts, and verify results via screenshots. `mcp/specifications.md` is the authoritative feature spec — consult it before extending MCP capabilities, since it documents editor conventions (units in centimeters, glTF auto-scaling x100, clustered light container usage, instancing-over-cloning rules, etc.) that the agent-facing tools must respect.

### Templates & website
- `templates/*` are full starter projects (each its own `package.json`/lockfile) copied into new user projects; `electron/` is a special template for packaging a project as a standalone Electron app. Their `src/scripts.ts` is excluded from the root ESLint run.
- `website/` is a standard Next.js app (App Router) with its own `documentation/` content tree mirrored from the editor's user-facing docs.

## Code style

- Formatting is enforced by Prettier (`prettier.config.mjs`): **tabs**, double quotes, semicolons, `printWidth: 180`, `arrowParens: "always"`.
- TypeScript: `strictNullChecks`, `noUnusedLocals`/`noUnusedParameters`, decorators enabled (`experimentalDecorators`).
- ESLint naming conventions: interfaces are `PascalCase` prefixed with `I` (e.g. `IEditorProject`), enum members `PascalCase`, private class members `camelCase` with a leading underscore, and `@typescript-eslint/explicit-member-accessibility` + the local `require-return-type-on-class-methods` rule mean every class method/member needs explicit `public`/`private` and a return type.

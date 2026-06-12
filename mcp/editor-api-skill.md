---
name: babylonjs-editor-automation-api
description: Reference for writing Babylon.js Editor automation scripts (agentdata/*.js exporting main(editor)) run via the MCP tools write_agent_script / run_agent_script. Use when a scene-building task is too complex or voluminous for the individual MCP tools (procedural geometry, scattering forests/cities, bulk programmatic edits) and you need to drive the editor's `editor` mediator and live Babylon scene directly.
---

# Babylon.js Editor — Automation Scripts API

Automation scripts let you run real code **inside the editor** to build content that would be tedious with one-tool-at-a-time calls (procedural geometry, scattering, bulk edits). Everything they create becomes **real, hand-editable editor content** — not runtime game code.

> Prefer the dedicated MCP tools (`create_primitive_mesh`, `create_material`, `create_instance`, `create_light`, …) for ordinary building. Reach for an automation script only for the heavy, algorithmic parts.

## How to run one

1. (Optional) `list_agent_scripts` to see what already exists.
2. `write_agent_script({ name: "forest.js", content: "..." })` — writes to the project-root `agentdata/` folder.
3. `run_agent_script({ name: "forest.js" })` — compiles and executes it. (Or pass `content` inline to write-and-run in one call.)

The script is compiled with the editor's own pipeline and executed by calling its `main(editor)` export. It may be `async`. Return a short **string** summary — it's sent back to you (objects like meshes are not serialized).

## Skeleton

```js
import { Tools, Vector3 } from "babylonjs";
import { UniqueNumber } from "babylonjs-editor";

export function main(editor) {
    // build content here; may be async (return a Promise)
    return "summary of what was done";
}
```

## Imports / module resolution

- Babylon: `import { ... } from "babylonjs"` (also `"babylonjs-gui"`, `"babylonjs-loaders"`, `"babylonjs-materials"`, `"babylonjs-post-process"`, `"babylonjs-procedural-textures"`, `"babylonjs-addons"`). `@babylonjs/*` imports are auto-rewritten. The editor injects its OWN Babylon instance, so your objects share the live scene.
- Editor helpers: `import { UniqueNumber } from "babylonjs-editor"` (the editor's public API). Resolves to the running editor at runtime.

## ⚠️ MANDATORY: set `id` and `uniqueId` on EVERY created entity

Every entity you create (mesh, instance, light, camera, transform node, material, …) **must** have both an `id` and a `uniqueId`, or the editor's inspector, selection and serialization will break:

```js
import { Tools } from "babylonjs";
import { UniqueNumber } from "babylonjs-editor";

entity.id = Tools.RandomId();
entity.uniqueId = UniqueNumber.Get();
```

This applies to instanced meshes too (`mesh.createInstance(...)`).

## The `editor` mediator

`editor` is the editor's central object. Most useful members:

### Scene & rendering
- `editor.layout.preview.scene` → the live **Babylon.js `Scene`**. Your main entry point: create/find meshes, materials, lights, cameras. Pass it to Babylon constructors / `MeshBuilder` so objects join the live scene.
- `editor.layout.preview.engine` → the Babylon engine.
- `editor.layout.preview.camera` → the editor camera.
- `editor.layout.preview.clusteredLightContainer` → add non-shadow lights here for performance (`.addLight(light)`).
- `editor.layout.preview.switchToCamera(camera)` → make a camera active (saves/restores its per-camera post-processes).

### Scene graph (left panel) — call after adding/removing nodes so they appear
- `await editor.layout.graph.refresh()`
- `editor.layout.graph.setSelectedNode(node)`
- `editor.layout.graph.getSelectedNodes()`

### Inspector (right panel)
- `editor.layout.inspector.setEditedObject(object)`
- `editor.layout.inspector.forceUpdate()`

### Assets browser
- `editor.layout.assets.refresh()`

### Console (visible to the user in the editor; NOT returned to you)
- `editor.layout.console.log(msg)` / `.warn(msg)` / `.error(msg)`

### Layout / project
- `editor.layout.addLayoutTab(...)`, `editor.layout.selectTab(id)`, `editor.layout.removeLayoutTab(id)`
- `editor.path` → the editor application path.

For the full surface, the editor source under `/editor/src/editor` (`preview`, `layout`, `graph`, `inspector`, `assets-browser`) is the reference.

## Conventions

- **Units are centimeters.** Imported glTF/glb are auto-scaled ×100.
- Add objects to `editor.layout.preview.scene`.
- Set `id` + `uniqueId` on everything you create (see above).
- Prefer `sourceMesh.createInstance(name)` for many copies (cheap) over cloning; set `instance.parent = sourceMesh.parent`.
- Non-shadow lights → `editor.layout.preview.clusteredLightContainer.addLight(light)`.
- After building: `await editor.layout.graph.refresh()` and select a representative node.
- Don't clear the scene or delete the user's existing content unless asked.

## Examples

### Scatter a forest from an existing "Tree" mesh
```js
import { Tools, Vector3 } from "babylonjs";
import { UniqueNumber } from "babylonjs-editor";

export function main(editor) {
    const scene = editor.layout.preview.scene;
    const tree = scene.getMeshByName("Tree");
    if (!tree) { return "No mesh named 'Tree' found — import one first."; }

    for (let i = 0; i < 200; i++) {
        const inst = tree.createInstance("Tree " + i);
        inst.id = Tools.RandomId();
        inst.uniqueId = UniqueNumber.Get();
        inst.parent = tree.parent;
        inst.position = new Vector3((Math.random() - 0.5) * 20000, 0, (Math.random() - 0.5) * 20000);
        inst.rotation.y = Math.random() * Math.PI * 2;
        const s = 0.8 + Math.random() * 0.5;
        inst.scaling.set(s, s, s);
    }

    editor.layout.graph.refresh();
    return "Created 200 tree instances.";
}
```

### A grid of voxel blocks from one source cube
```js
import { Tools, MeshBuilder, Vector3 } from "babylonjs";
import { UniqueNumber } from "babylonjs-editor";

export function main(editor) {
    const scene = editor.layout.preview.scene;

    const block = MeshBuilder.CreateBox("Block", { size: 100 }, scene);
    block.id = Tools.RandomId();
    block.uniqueId = UniqueNumber.Get();

    const N = 16;
    for (let x = 0; x < N; x++) {
        for (let z = 0; z < N; z++) {
            const inst = block.createInstance(`Block ${x}_${z}`);
            inst.id = Tools.RandomId();
            inst.uniqueId = UniqueNumber.Get();
            inst.parent = block.parent;
            inst.position = new Vector3(x * 100, 0, z * 100);
        }
    }

    editor.layout.graph.refresh();
    return `Created a ${N}x${N} block grid.`;
}
```

### Custom geometry from raw vertex data
```js
import { Tools, Mesh, VertexData } from "babylonjs";
import { UniqueNumber } from "babylonjs-editor";

export function main(editor) {
    const scene = editor.layout.preview.scene;

    const mesh = new Mesh("CustomGeometry", scene);
    mesh.id = Tools.RandomId();
    mesh.uniqueId = UniqueNumber.Get();

    const data = new VertexData();
    data.positions = [0, 0, 0, 100, 0, 0, 50, 100, 0];
    data.indices = [0, 1, 2];
    data.normals = [];
    VertexData.ComputeNormals(data.positions, data.indices, data.normals);
    data.applyToMesh(mesh);

    editor.layout.graph.refresh();
    return "Created a custom triangle mesh.";
}
```

## Don't

- Don't use automation scripts as a substitute for authoring — they must produce real editor content, not procedural runtime code.
- Don't forget `id`/`uniqueId` on created entities.
- Don't confuse these with **behavior scripts** (`create_script`/`attach_script`, under `src/`, implementing `IScript` `onStart`/`onUpdate`/`onStop`) which run in the FINAL GAME. Automation scripts run NOW, in the editor, to build the scene.

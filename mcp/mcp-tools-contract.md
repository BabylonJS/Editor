# Babylon.js Editor — MCP Tools Contract (shared implementation spec)

This document is the **single source of truth shared by two implementations**:

1. The **MCP server** package (`mcp/`) — registers each tool and forwards it to the editor.
2. The **editor** side (`editor/src/mcp/`) — runs the HTTP server and executes each endpoint against the live scene.

Both implementations MUST agree on the **endpoint name**, **input fields**, and **output shape** defined here. Do not rename endpoints or change shapes without updating this file.

Derived from `mcp/specifications.md`. Goal: an AI agent connected to this MCP must be able to fully build a game (e.g. "make a Minecraft clone") — compose scenes, manage assets/marketplace, write & attach scripts, optimize via instancing, and verify visually via screenshots.

---

## Transport & envelope

- Editor runs an HTTP server on `http://127.0.0.1:3712` (see `editor/src/mcp/mcp.ts`).
- The MCP server POSTs to `http://localhost:3712/{endpoint}` with JSON body `{ endpoint, ...inputFields }` (see `mcp/src/request.mts`).
- **Editor handler return contract:**
  - Handlers are `(scene: Scene, data: any, options: IMCPActionOptions) => any | Promise<any>`.
  - On success: HTTP `200`, body = the JSON value the handler returns (this is the tool's `data`).
  - On thrown error: HTTP `500`, body = `{ "error": "<message>" }`.
- **MCP `request.mts`** must return `{ json, text, isError }`:
  - `json` = parsed response body (object/value), `text` = pretty-printed JSON string, `isError` = `true` when HTTP status is not ok.
- **Most MCP tools** return `{ content: [{ type: "text", text }], isError }`.
- **Image-returning tools** (`get_screenshot`, `get_asset_preview`) return `{ content: [{ type: "image", data, mimeType }], isError }` where the editor handler returns `{ imageBase64: string, mimeType: "image/png" }`.

### Node addressing
Nodes are addressed by `nodeId` (preferred, the Babylon `node.id`) OR `nodeName`. Endpoints that accept a target node accept both: `{ nodeId?: string, nodeName?: string }`. Resolve by id first, then by name. If neither resolves, throw `"Node not found: <id/name>"`. Materials are addressed by `materialId` similarly. Asset files are addressed by project-relative or absolute `path`.

### Visibility requirement (critical, from spec §"Important notes")
Every editor handler that mutates the scene MUST make the change visible in the editor UI:
- After creating/deleting/reparenting/renaming nodes: `editor.layout.graph.refresh()`.
- After creating/modifying a node: `editor.layout.inspector.setEditedObject(node)` and `editor.layout.graph.setSelectedNode(node)` where appropriate.
- After modifying the edited object's props: `editor.layout.inspector.forceUpdate()`.
- After creating/modifying assets (materials, scripts, etc.): refresh the assets browser (`editor.layout.assets.refresh()` — confirm method name).
- Prefer reusing existing editor "add"/mutation functions (`editor/src/project/add/*`, `editor/src/tools/*`) which already wire selection/gizmo/refresh, so behavior matches manual user actions and integrates with undo/redo where those functions do.

---

## Tools

### Scene & project

| endpoint | description | input | output |
|---|---|---|---|
| `get_scene_hierarchy` | Hierarchy of nodes as a tree (EXISTS, keep). | `{ rootNodeName?: string }` | tree of `{ id, name, type, children[] }` (extend existing to include `type`) |
| `list_scenes` | List all `.scene` assets in the project. | `{}` | `{ scenes: [{ name, path, isActive }] }` |
| `get_active_scene` | Name/path of the currently edited scene + counts. | `{}` | `{ name, path, meshCount, lightCount, materialCount }` |
| `save_scene` | Save the current scene/project. | `{}` | `{ saved: true }` |
| `get_scene_settings` | Scene-level settings (clear color, ambient color, environment texture, fog, active camera). | `{}` | object |
| `set_scene_settings` | Set scene-level settings via property paths. | `{ properties: { [path]: value } }` | updated settings |

### Node generic operations

| endpoint | description | input | output |
|---|---|---|---|
| `get_node` | Full details of a node. | `{ nodeId?, nodeName? }` | `{ id, name, className, position, rotation, rotationQuaternion?, scaling, isEnabled, isVisible?, parentId?, materialId?, metadata }` |
| `set_node_transform` | Set transform. Values in editor units (cm). Rotation in radians. Works for meshes/transform nodes (position/rotation/scaling), lights (position/direction) and cameras (position/rotation/target). Only provided & node-supported fields are applied. | `{ nodeId?, nodeName?, position?: [x,y,z], rotation?: [x,y,z], scaling?: [x,y,z], direction?: [x,y,z], target?: [x,y,z] }` | updated node summary (incl. `direction` when present) |
| `set_node_properties` | Generic deep property set by dotted path (e.g. `"material.albedoColor"`, `"isVisible"`). Values may be numbers, strings, booleans, or `[r,g,b]`/`[x,y,z]` arrays which must be coerced to Color3/Vector3 based on the existing property type. | `{ nodeId?, nodeName?, properties: { [path]: value } }` | updated node summary |
| `set_node_parent` | Reparent (preserve world transform via `setParent`). `parentId/parentName` null → root. If new parent is a ClusteredLightContainer and node is a non-shadow light, use `addLight`. | `{ nodeId?, nodeName?, parentId?, parentName?, preserveWorldTransform?: boolean }` | updated node summary |
| `rename_node` | Rename a node. | `{ nodeId?, nodeName?, newName }` | updated node summary |
| `delete_node` | Remove a node (and descendants). | `{ nodeId?, nodeName? }` | `{ deleted: true }` |
| `select_node` | Select/focus a node in the editor (UX only). | `{ nodeId?, nodeName? }` | `{ selected: true }` |
| `get_selected_nodes` | Get the nodes currently selected by the user in the editor graph. Use for "the selected node(s)" requests (e.g. instantiate the selected node to build a forest). | `{}` | `{ count, nodes: nodeSummary[] }` |

### Meshes

| endpoint | description | input | output |
|---|---|---|---|
| `create_primitive_mesh` | Create a primitive. Reuse `editor/src/project/add/mesh.ts`. | `{ type: "box"|"sphere"|"ground"|"plane"|"cylinder"|"capsule"|"torus"|"torusknot"|"skybox"|"empty", name?, parentId?, position?, options?: object }` | created node summary (incl. `id`) |
| `create_instance` | Create InstancedMesh(es) from a source mesh. **Must use `editor/src/tools/mesh/instance.ts` `createMeshInstance`** (not raw `mesh.createInstance`) so each instance gets a real `id`/`uniqueId`, copied transform/visibility/enabled, and collision/shadow wiring — otherwise the inspector shows no properties. Defaults each instance's parent to the **source mesh's parent**; `parentId` overrides. | `{ sourceNodeId?, sourceNodeName?, name?, count?: number, parentId?, transforms?: [{position?,rotation?,scaling?}] }` | `{ instances: [nodeSummary] }` |
| `clone_mesh` | Clone a mesh. `cloneGeometry=false` shares geometry (spec: clone only when material must differ). | `{ sourceNodeId?, sourceNodeName?, name?, cloneGeometry?: boolean }` | created node summary |
| `set_mesh_material` | Assign an existing material to a mesh. | `{ nodeId?, nodeName?, materialId }` | updated node summary |
| `set_mesh_visibility` | Visibility/enabled toggles. | `{ nodeId?, nodeName?, isVisible?, isEnabled?, visibility?: number }` | updated node summary |
| `set_mesh_physics` | Add/update/remove a Havok physics body (gameplay). Mirrors `editor/src/editor/layout/inspector/mesh/physics.tsx`: creates a `PhysicsAggregate` with `getPhysicsShapeForMesh` default, sets `body.disableSync=true`. `motionType` static/dynamic/animated; `shapeType` box/sphere/capsule/cylinder/mesh; mass on body mass properties; friction/restitution on shape material. | `{ nodeId?, nodeName?, enabled?: boolean, mass?, motionType?, shapeType?, friction?, restitution? }` | node summary + `{ physics }` |
| `get_mesh_bounding_info` | Bounding box in local & world space + whole-hierarchy world bounds (for scattering/placement). | `{ nodeId?, nodeName? }` | `{ local:{min,max,center,size}, world:{min,max,center,size}, hierarchyWorld:{min,max,size} }` |

### Lights & shadows

| endpoint | description | input | output |
|---|---|---|---|
| `create_light` | Create a light. Reuse `editor/src/project/add/light.ts`. | `{ type: "directional"|"point"|"spot"|"hemispheric", name?, parentId?, position?, direction?, color?: [r,g,b], intensity?, range?, angle? }` | created node summary |
| `set_light_shadows` | Enable/disable a shadow generator on a light + config. `generatorType: "cascaded"` uses a `CascadedShadowGenerator` (directional lights only; best for large outdoor scenes). | `{ nodeId?, nodeName?, enabled: boolean, generatorType?: "classic"|"cascaded", mapSize?, numCascades?, lambda?, useBlurExponentialShadowMap?, darkness? }` | updated light summary |
| `remove_light_shadows` | Remove the shadow generator from a light (stops casting shadows). | `{ nodeId?, nodeName? }` | updated light summary |
| `create_clustered_light_container` | Create the scene's ClusteredLightContainer (if not present). | `{}` | node summary |
| `add_light_to_clustered_container` | Move a non-shadow light into the ClusteredLightContainer (spec §performance). | `{ nodeId?, nodeName? }` | updated summary |
| `remove_light_from_clustered_container` | Remove a light from the ClusteredLightContainer; it returns to the scene as a regular light. | `{ nodeId?, nodeName? }` | updated summary |

### Cameras

| endpoint | description | input | output |
|---|---|---|---|
| `create_camera` | Create a camera. Reuse `editor/src/project/add/camera.ts`. | `{ type: "free"|"arcrotate"|"universal", name?, position?, target?, options?: object }` | created node summary |
| `set_active_camera` | Set the scene active camera. Routes through the preview's camera switch so per-camera post-processes are saved/restored. | `{ nodeId?, nodeName? }` | `{ activeCamera }` |

### Camera post-processes / rendering pipelines

Per-camera effects. **Post-processes are per-camera**, so configuring one switches the editor's active camera to the target camera (so the effect attaches to it and is exported for runtime). Supported `type`s: `default` (DefaultRenderingPipeline: bloom, tone mapping, FXAA, image processing, vignette, DOF, chromatic aberration, grain, sharpen, glow, color grading/curves), `ssao`, `ssr`, `motionBlur`, `vls`, `taa`. Editor side: `editor/src/mcp/rendering/post-process.ts` reuses `editor/src/editor/rendering/*` (`get*`/`create*`/`dispose*`/`serialize*`/`parse*`) + `saveRenderingConfigurationForCamera`, and the preview's new public `switchToCamera(camera)`.

| endpoint | description | input | output |
|---|---|---|---|
| `get_camera_post_processes` | Read all post-process configs for a camera (live if active, else the camera's saved config; null when disabled). | `{ nodeId?, nodeName? }` | `{ camera, cameraId, isActive, postProcesses: { default, ssao, ssr, motionBlur, vls, taa } }` |
| `set_camera_post_process` | Enable/disable + customize a post-process for a camera (switches active camera first). Properties are the flat serialized keys of the corresponding pipeline. | `{ nodeId?, nodeName?, type, enabled?: boolean, properties?: object }` | `{ camera, type, enabled, config }` |

### Materials & textures

| endpoint | description | input | output |
|---|---|---|---|
| `list_materials` | All materials in scene/project (incl. `.material` assets). | `{}` | `{ materials: [{ id, name, className, path? }] }` |
| `list_material_types` | Catalog of creatable material types incl. the Materials Library (sky, grid, normal, water, lava, triplanar, cell, fire, gradient), each with `use` + `keyProperties` (settable via `set_material_properties`). Static catalog in `editor/src/mcp/materials/materials.ts`. | `{}` | `{ types: [{ type, className, library, use, keyProperties[] }] }` |
| `create_material` | Create a material (incl. Materials Library types like SkyMaterial). Reuse `editor/src/project/add/material.ts`. Persist as a `.material` asset so it appears in the assets browser. | `{ type: "pbr"|"standard"|"sky"|"grid"|"normal"|"water"|"lava"|"triplanar"|"cell"|"fire"|"gradient"|"node", name?, folder?: string }` | `{ id, name, path }` |
| `set_material_properties` | Deep property set by dotted path (`albedoColor`, `metallic`, `roughness`, `emissiveColor`, `alpha`, `wireframe`, `diffuseColor`, …). Coerce `[r,g,b]`→Color3. | `{ materialId, properties: { [path]: value } }` | updated material summary |
| `assign_texture_to_material` | Load a texture asset and assign it to a material channel. | `{ materialId, channel: "albedoTexture"|"bumpTexture"|"metallicTexture"|"emissiveTexture"|"diffuseTexture"|"opacityTexture"|..., texturePath }` | updated material summary |
| `set_environment_texture` | Set scene environment/skybox from a `.env`/`.hdr` cube texture asset. | `{ texturePath, createSkybox?: boolean }` | `{ ok: true }` |

### Assets browser

| endpoint | description | input | output |
|---|---|---|---|
| `list_assets` | List project assets, optionally filtered by type. Include whether an `editor_preview.png` exists for the containing folder. | `{ type?: "texture"|"cube-texture"|"mesh"|"sound"|"material"|"particle"|"json"|"navmesh", folder?: string }` | `{ assets: [{ name, path, type, hasPreview }] }` |
| `get_asset_preview` | Return the folder `editor_preview.(png/jpg/bmp)` or a generated thumbnail as base64 (image tool). | `{ path }` | `{ imageBase64, mimeType }` |
| `instantiate_mesh_asset` | Load a mesh asset (`.glb/.gltf/.babylon/.fbx`) into the scene = drag'n'drop equivalent (auto x100 scale for glTF per spec). Reuse `editor/src/editor/layout/preview/import/*`. | `{ path, name?, parentId?, position? }` | `{ rootNodeId, createdNodes: [nodeSummary] }` |

### Particle systems

| endpoint | description | input | output |
|---|---|---|---|
| `list_particle_assets` | List `.npss` node particle system assets. | `{}` | `{ assets: [{ name, path }] }` |
| `instantiate_particle_system` | Instantiate a `.npss` asset / create a default one in the scene. | `{ path?, name?, emitterNodeId?, position? }` | created summary |

### Marketplace (must be visible in editor — spec §marketplace, §important notes)

| endpoint | description | input | output |
|---|---|---|---|
| `open_marketplace` | Open the marketplace browser tab in the editor. | `{ source?: "polyhaven"|"ambientcg"|"sketchfab" }` | `{ opened: true }` |
| `search_marketplace` | Search a marketplace (driven through the editor's marketplace browser, not background APIs). | `{ source: "polyhaven"|"ambientcg"|"sketchfab", query: string, type?: "texture"|"mesh"|"cube-texture" }` | `{ results: [{ id, name, source, type, thumbnailUrl? }] }` |
| `download_marketplace_asset` | Trigger a visible download into the project via the editor marketplace browser. Shows the same bottom-right progress toast (`ImportProgress`) the UI uses, so the user sees/cancels the download. | `{ source, assetId, resolution?: string }` | `{ downloadedPath }` |

### Scripts (TypeScript behaviors)

Reference: `tools/src/script.ts` (`IScript` = `onStart`/`onUpdate`/`onStop`). Script attachment metadata lives on nodes; see `editor/src/editor/layout/inspector/script/*`. Scripts must live under `src/**`.

| endpoint | description | input | output |
|---|---|---|---|
| `list_scripts` | List TS scripts under the project `src/`. | `{}` | `{ scripts: [{ name, path }] }` |
| `create_script` | Create a new TS script with the editor's default skeleton at a path under `src/`. | `{ path, className? }` | `{ path }` |
| `read_script` | Read a script's content. | `{ path }` | `{ content }` |
| `write_script` | Overwrite/update a script's content. | `{ path, content }` | `{ path }` |
| `attach_script` | Attach a script file to a node (writes the node script metadata as the inspector does). | `{ nodeId?, nodeName?, path }` | updated node summary |
| `list_attached_scripts` | List scripts attached to a node + their exported values. | `{ nodeId?, nodeName? }` | `{ scripts: [{ path, exportedValues }] }` |
| `set_script_exported_value` | Set an exported/inspector value of an attached script on a node. | `{ nodeId?, nodeName?, path, key, value }` | updated summary |
| `detach_script` | Remove an attached script from a node. | `{ nodeId?, nodeName?, path }` | updated summary |

### Agent automation scripts (`.js` run in the editor)

Distinct from behavior scripts: these are `.js` files in a root **`agentdata/`** folder, exporting `main(editor)`, compiled+executed INSIDE the editor (reusing the "Run script" pipeline: `editor/src/tools/compile.ts` `compileScript` → `require(outfile).main(editor)`, see `editor/src/editor/layout/assets-browser/items/javascript-item.tsx`). For complex/voluminous authoring (procedural geometry, scattering, bulk edits). Editor handlers in `editor/src/mcp/scripts/editor-scripts.ts`.

| endpoint | description | input | output |
|---|---|---|---|
| `get_editor_api` | Reference for the `editor` mediator object (scene at `editor.layout.preview.scene`, graph/inspector/assets/console, conventions) + the `main(editor)` skeleton + a forest example. Derived from `/editor/src/editor`. | `{}` | `{ reference: string }` |
| `write_agent_script` | Write/overwrite a `.js` script under `agentdata/` (name sanitized, `.js` enforced, no `..`). Must export `main(editor)`. | `{ name, content }` | `{ path }` |
| `run_agent_script` | Compile + run an `agentdata/` script's `main(editor)` (await async). Accepts existing `name` or inline `content` (write-and-run). Refreshes graph/assets after. Returns only a primitive script result. | `{ name?, content? }` | `{ ran: true, script, result }` |
| `list_agent_scripts` | List `.js` scripts in `agentdata/`. | `{}` | `{ scripts: [{ name, path }] }` |

### Verification & utility

| endpoint | description | input | output |
|---|---|---|---|
| `get_screenshot` | Screenshot of the preview for visual verification. Reuse `editor/src/tools/scene/screenshot.ts` `getBase64SceneScreenshot`. | `{ width?: number, height?: number }` | `{ imageBase64, mimeType: "image/png" }` (image tool) |
| `focus_node` | Frame the camera on a node (helps screenshots). | `{ nodeId?, nodeName? }` | `{ ok: true }` |
| `run_project` | (Optional) Start the project dev/run process. | `{}` | `{ started: true }` |

### Batch (spec §"Important notes")

| endpoint | description | input | output |
|---|---|---|---|
| `execute_batch` | Execute an ordered list of actions in one round-trip. Each action runs the same handler as its standalone endpoint. Stops on first error unless `continueOnError`. | `{ actions: [{ endpoint: string, data: object }], continueOnError?: boolean }` | `{ results: [{ endpoint, ok, data?, error? }] }` |

The MCP server exposes `execute_batch` as a single tool taking an array of `{ tool, arguments }`. The editor implements it by iterating `MCPEndpoints` in order. Make a single `graph.refresh()` / assets refresh at the end of the batch rather than per-action for performance.

---

## node summary shape (reused by many outputs)
```ts
{
  id: string;
  name: string;
  className: string;        // node.getClassName()
  position?: [number, number, number];
  rotation?: [number, number, number];
  scaling?: [number, number, number];
  parentId?: string | null;
  materialId?: string | null;
  isEnabled: boolean;
  isVisible?: boolean;
}
```

## Implementation notes for the editor side
- Add handler modules under `editor/src/mcp/` grouped by domain: `scene/`, `nodes/`, `meshes/`, `lights/`, `cameras/`, `materials/`, `assets/`, `particles/`, `marketplace/`, `scripts/`, plus `screenshot.ts` and `batch.ts`. Register every endpoint in the `MCPEndpoints` map in `editor/src/mcp/mcp.ts`.
- Wire `initializeMcpServer(editor)` into editor startup — it is currently defined but never called. Call it once the layout/preview scene is ready (e.g. end of `Editor.componentDidMount` in `editor/src/editor/main.tsx`, guarded so it only starts once and ideally only when MCP/experimental features are enabled).
- A shared `editor/src/mcp/tools/resolve.ts` for `resolveNode({scene,nodeId,nodeName})`, `resolveMaterial(...)`, `toNodeSummary(node)`, and Color3/Vector3 coercion keeps handlers small.
- Respect editor units (cm) and glTF auto-scale (×100) already handled by the import path — do not re-apply scaling.
- Keep handlers synchronous where the underlying editor function is sync; return Promises where async (imports, downloads, screenshots).

## Implementation notes for the MCP server side
- Keep `mcp/src/index.mts` thin; consider splitting tool registrations into `mcp/src/tools/*.mts` modules imported by `index.mts`, OR register inline grouped by domain. Each tool builds a zod `inputSchema`, calls `notifyAndGetResultFromEditor(endpoint, args)`, and maps the result to `CallToolResult`.
- Extend `mcp/src/request.mts` to also return parsed `json` and a correct `isError` derived from HTTP status, without breaking the existing `text` field.
- Add an image helper so `get_screenshot`/`get_asset_preview` return `{ type: "image", data, mimeType }`.
- Update `mcp/manifest.json` `tools` array to list every tool with a one-line description.
- Tool `title`/`description` text is the agent's only guidance — write descriptions that teach the agent the workflow & performance rules from the spec (prefer instances over clones; non-shadow lights go in the clustered container; verify with screenshots; download assets via the visible marketplace; scripts go under `src/`).
- Pass server-level `instructions` to the `McpServer` constructor (2nd arg `ServerOptions`). These are surfaced to the agent once and are the place to state global guidance. The **#1 rule** must be: AUTHOR the scene with editor tools (real meshes/materials/instances/lights/cameras/particles/physics) so the user can hand-edit the result — do NOT clear the scene, create empty placeholder meshes, or generate geometry/materials/lighting/levels procedurally inside scripts. Scripts (`create_script`/`write_script`/`attach_script`) are for runtime BEHAVIOR only (input, game rules, AI, runtime spawning from already-authored assets). Then: **use `execute_batch` as much as possible** (one round-trip + one UI refresh; only split when a later action needs an earlier action's returned id), prefer instances over clones, clustered lights, cm units / glTF ×100, scripts under `src/`, physics via `set_mesh_physics`, collisions/deep props via `set_node_properties`, verify with `get_screenshot`. The script tool descriptions must reinforce "behavior only, not scene construction".
```

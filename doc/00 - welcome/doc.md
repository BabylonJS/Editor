# Welcome to the Babylon.JS Editor documentation

Welcome to the documentation of the Babylon.JS Editor. A series of tutorials are available to understand the basics of the Editor. It is recommanded to read the tutorials before starting with the Editor.

## Tutorials
* Workspace
  * [Creating a new workspace](../01%20-%20create-workspace/0-create-new-workspace.md)
  * [Creating a new scene](../01%20-%20create-workspace/1-creating-new-scene.md)
  * [Renaming a scene](../01%20-%20create-workspace/2-renaming-scene.md)
* Running the scene
  * [Running application/game](../02%20-%20running-project/0-running-project.md)
  * [Playing scene](../02%20-%20running-project/1-playing-scene.md)
* Using Assets Browser
  * [Introduction](../03%20-%20adding-assets/0-introduction.md)
  * [Adding files](../03%20-%20adding-assets/1-adding-files.md)
  * [Adding meshes](../03%20-%20adding-assets/2-adding-meshes.md)
  * [Adding materials](../03%20-%20adding-assets/3-adding-materials.md)
  * [Using textures](../03%20-%20adding-assets/4-using-textures.md)
* Scripting
  * [Attaching scripts](../04%20-%20attaching-scripts/attaching-scripts.md)
  * [Exposing properties](../04%20-%20attaching-scripts/0-exposing-properties.md)
  * [Getting components](../04%20-%20attaching-scripts/1-getting-components.md)
  * [Listening events](../04%20-%20attaching-scripts/2-listening-events.md)
* Physics
  * [Using physics](../05%20-%20using-physics/using-physics.md)
* Collisions
  * [Basic collisions](../06%20-%20setting-collisions/basic.md)
  * [Advanced collisions](../06%20-%20setting-collisions/advanced.md)
* Painting Tools
  * [Decals painting](../07%20-%20using-painting-tools/decals-painting-tool.md)

## Legacy, Babylon.JS Editor < 4.1.0
* Adding assets
  * [Adding meshes](../03%20-%20adding-assets/legacy/0-adding-meshes.md)
  * [Adding materials](../03%20-%20adding-assets/legacy/1-adding-materials.md)
  * [Adding textures](../03%20-%20adding-assets/legacy/2-adding-textures.md)
  * [Adding sounds](../03%20-%20adding-assets/legacy/3-adding-sounds.md)

## Troubleshoothing
* [Blurred UI](../troubleshooting/blurred-ui.md)
* [Can't start editor](../troubleshooting/startup.md)

## External tutorials

* [Introduction to the Babylon.JS Editor v4](https://www.crossroad-tech.com/entry/babylonjs-editor-v4-introduction-en) by [@Limes2018](https://gist.github.com/flushpot1125)

## External examples

* [Using WebXR with Babylon.JS Editor v4](https://github.com/flushpot1125/WebXR_VRController_Editor_template) by [@Limes2018](https://gist.github.com/flushpot1125)

## Useful shortcuts

### Global
* `Ctrl+s` or `Command+s`: save the project.
* `Ctrl+f` or `Command+f`: find a node in the current scene or run a command
* `Ctrl+r` or `Command+r`: run the application/game in the integrated browser
* `Ctrl+b` or `Command+b`: build the project (using WebPack, this can take a while)
* `Ctrl+g` or `Command+g`: generate the project (generates all outputs of the current project (scripts, scene files, etc.))
* `Ctrl+Shift+r` or `Command+Shift+r`: build and run the application/game
* `Ctrl+z` or `Command+z`: Undo action
* `Ctrl+y` or `Command+Shift+z`: Redo action

### In preview
* `f`: focus the selected node
* `t`: enable/disable the positon gizmo
* `r`: enable/disable the rotation gizmo
* `w`: enable/disable the scaling gizmo
* `i`: toggle the isolated mode. Isolated mode is used to help debugging a mesh by isolating it. Just select a mesh in the Editor and then type `i`. `escape` to exit isolation mode.
* `suppr.`: remove the selected node
* `Ctrl+c` or `Command+c`: copy the selected node
* `Ctrl+v` or `Command+v`: past previously copied node. In case of a mesh, a new instance will be created instead of a real clone of the mesh.

* `Ctrl+0`: focus the selected node and go to the `bottom` of the node
* `Ctrl+5`: focus the selected node and go to the `top` of the node
* `Ctrl+4`: focus the selected node and go to the `left` of the node
* `Ctrl+6`: focus the selected node and go to the `right` of the node
* `Ctrl+8`: focus the selected node and go to the `back` of the node
* `Ctrl+2`: focus the selected node and go to the `front` of the node

# Adding Meshes

As any other scene Editor, to workflow is:
* Add new assets to the project
* Add asset to the current scene (here, meshes)
* Edit instantiated assets

## Supported meshes formats
The Editor supports the 3 common formats:
* .babylon
* .gltf
* .glb

## Adding assets to the project
There are 2 ways to add meshes assets to the current project: browse for files or drag'n'drop files in the assets panel of the Editor.
In both ways, take care to select/drag'n'drop all needed files for the meshes.

### Browsing for files
Simply go to the "Assets" panel of the Editor and click "Add...". A dialog opens to select the files:

![Browse](./browse.gif)

### Drag'n'dropping files

![DragAndDrop](./draganddrop.gif)

## Examining the asset
Once the asset has been added to the project, we can examine the asset's file by `double clicking` on it. This will open a new window and open the `Inspector` of Babylon.JS with the asset rendered.

You can refer to [the inspector documentation](https://doc.babylonjs.com/features/playground_debuglayer]) to understand how to use the Babylon.JS Inspector.

![Examining](./examining.gif)

## Adding meshes to the scene
To add meshes to the scene, simply drag'n'drop the asset to the preview of the Editor. This will add the meshes contained in the asset with their materials/textures to the scene.
Once added, you can select elements in the graph and edit them using the Inspector of the Editor.

![AddingToScene](./addingtoscene.gif)

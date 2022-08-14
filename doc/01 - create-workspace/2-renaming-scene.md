# Renaming A Scene

To rename a scene, just go to the `Assets Browser` panel and rename the scene file by double-clicking its name.

Once accepted, the following folders will be renamed:
- *`workspacePath`/projects/`oldname`* ->  *`workspacePath`/projects/`newname`* 
- *`workspacePath`/scenes/`oldname`* -> *`workspacePath`/scenes/`newname`*

Scene names must be unique. In case the folders already exists (in other words, if the scene already exists)
then the operation is aborted.

## Renaming paths in loaders in sources
Paths to scenes being loaded in the code must have their paths updated.

For example:
```typescript
const rootUrl = "./scenes/oldName/";

SceneLoader.Append(rootUrl, "scene.babylon", this.scene, () => {
	...
});
```

should be renamed to:
```typescript
const rootUrl = "./scenes/newName/";

SceneLoader.Append(rootUrl, "scene.babylon", this.scene, () => {
	...
});
```

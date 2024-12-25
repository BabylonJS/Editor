import { BaseTexture, Node, Observable } from "babylonjs";

/**
 * Observable for when the project has been saved.
 */
export const onProjectSavedObservable = new Observable<void>();

/**
 * Observable for when new nodes have been added to the scene.
 */
export const onNodesAddedObservable = new Observable<void>();

/**
 * Observable for when a node has been modified in the editor.
 */
export const onNodeModifiedObservable = new Observable<Node>();

/**
 * Observable for when a texture has been modified in the editor.
 */
export const onTextureModifiedObservable = new Observable<BaseTexture>();

/**
 * Observable used for when the path browsed by "Assets Browser" has changed.
 */
export const onAssetsBrowsedPathChanged = new Observable<string>();

/**
 * Observable used for when the selected asset in "Assets Browser" has changed.
 */
export const onSelectedAssetChanged = new Observable<string>();

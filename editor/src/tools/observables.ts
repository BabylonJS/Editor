import { BaseTexture, Node, Observable } from "babylonjs";

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

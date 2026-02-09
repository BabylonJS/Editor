import { BaseTexture, Node, Observable, IParticleSystem, Sprite, Skeleton } from "babylonjs";

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
 * Observable for when a skeleton has been modified in the editor.
 */
export const onSkeletonModifiedObservable = new Observable<Skeleton>();

/**
 * Observable for when a sprite has been modified in the editor.
 */
export const onSpriteModifiedObservable = new Observable<Sprite>();

/**
 * Observable for when new textures have been added to the scene.
 */
export const onTextureAddedObservable = new Observable<BaseTexture>();

/**
 * Observable for when a texture has been modified in the editor.
 */
export const onTextureModifiedObservable = new Observable<BaseTexture>();

/**
 * Observable for when new particle systems have been added to the scene.
 */
export const onParticleSystemAddedObservable = new Observable<IParticleSystem>();

/**
 * Observable for when a particle system has been modified in the editor.
 */
export const onParticleSystemModifiedObservable = new Observable<IParticleSystem>();

/**
 * Observable used for when the path browsed by "Assets Browser" has changed.
 */
export const onAssetsBrowsedPathChanged = new Observable<string>();

/**
 * Observable used for when the selected asset in "Assets Browser" has changed.
 */
export const onSelectedAssetChanged = new Observable<string>();

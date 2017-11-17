import { Scene } from 'babylonjs';

import { IExtension } from '../editor/typings/extension';

// Abstract class extension
export default abstract class Extension<T> implements IExtension<T> {
    // Public members
    public scene: Scene;
    public datas: T;
    public alwaysApply: boolean = false;

    /**
     * Constructor
     * @param scene: the scene
     */
    constructor (scene: Scene) {
        this.scene = scene;
    }

    /**
     * On apply the extension
     */
    public abstract onApply (data: T): void;

    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    public abstract onLoad (data: T): void;
}
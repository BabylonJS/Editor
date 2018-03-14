import { Scene } from 'babylonjs';

import Editor, { IExtension } from 'babylonjs-editor';

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
    public abstract onApply (data: T, rootUrl?: string): void;

    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    public abstract onLoad (data: T, editor?: Editor): void;

    /**
     * Adds a script tag element to the dom including source URL
     * @param code: the code's text
     * @param url: the URL of the script to show in devtools
     */
    public static AddScript (code: string, url: string): HTMLScriptElement {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.text = code + '\n' + '//# sourceURL=' + url + '\n';
        document.head.appendChild(script);

        return script;
    }
}
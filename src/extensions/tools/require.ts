import * as BABYLON from 'babylonjs';
import * as POSTPROCESS from 'babylonjs-post-process';
import * as MATERIALS from 'babylonjs-materials';
import * as LOADERS from 'babylonjs-loaders';
import * as PROCEDURALTEXTURES from 'babylonjs-procedural-textures';
import * as GUI from 'babylonjs-gui';
import * as CANNON from 'cannon';
import * as EARCUT from 'earcut';

import CodeExtension from '../behavior/code';

declare module EDITOR {
    class BehaviorCode {
        public static Constructors: any;
    }
}

/**
 * Defines the require function on window if doesn't exists
 */
export const defineRequire = () => {
    if (!window['require'])
        window['require'] = (name: string) => editorRequire(name);
};

/**
 * Overrides the "require" method on window to return the given lib
 * object. Allows to type, for example, "import { Mesh } from 'babylonjs';"
 * @param name the name of the lib to require
 */
export const editorRequire = (moduleName: string) => {
    switch (moduleName) {
        // Babylon.js
        case 'babylonjs':
            return BABYLON;
        case 'babylonjs-procedural-textures':
            return PROCEDURALTEXTURES;
        case 'babylonjs-loaders':
            return LOADERS;
        case 'babylonjs-materials':
            return MATERIALS;
        case 'babylonjs-post-process':
            return POSTPROCESS;
        case 'babylonjs-gui':
            return GUI;
        // Physics
        case 'cannon':
            return CANNON;
        // Tools
        case 'earcut':
            return EARCUT;
        // Custom script
        default:
            // Found in constructors
            let ctor = EDITOR.BehaviorCode.Constructors[moduleName];
            if (ctor) {
                const args = new Array(ctor.length);
                for (let i = 0; i < args.length; i++) {
                    args[i] = editorRequire;
                }
                return ctor.apply(ctor, args);
            }

            // Remove spaces
            ctor = EDITOR.BehaviorCode.Constructors[moduleName.replace(/ /g, '')];
            if (ctor)
                return ctor.apply(new Array(ctor.length).map(_ => editorRequire));

            // From instances
            const code = CodeExtension.Instance.datas.scripts.find(s => s.name === moduleName);
            if (!code)
                throw new Error(`Cannot find custom module named "${moduleName}"`);

            // Get on the fly
            ctor = CodeExtension.Instance.getConstructor(code, null);
            ctor.default = ctor;
            return ctor;
    }
};

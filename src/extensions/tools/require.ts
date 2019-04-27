import * as BABYLON from 'babylonjs';
import * as POSTPROCESS from 'babylonjs-post-process';
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
        case 'babylonjs-procedural-textures':
        case 'babylonjs-loaders':
        case 'babylonjs-materials':
            return BABYLON;
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
            if (ctor)
                return ctor.apply(new Array(ctor.length).map(_ => editorRequire));

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

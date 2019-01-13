import * as BABYLON from 'babylonjs';
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
            let ctor = EDITOR.BehaviorCode.Constructors[moduleName];
            if (ctor)
                return ctor();

            ctor = EDITOR.BehaviorCode.Constructors[moduleName.replace(/ /g, '')];
            if (ctor)
                return ctor();

            const code = CodeExtension.Instance.datas.scripts.find(s => s.name === moduleName);
            if (!code)
                throw new Error(`Cannot find custom module named "${moduleName}"`);

            ctor = CodeExtension.Instance.getConstructor(code, null);
            return ctor;
    }
};

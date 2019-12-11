import { exportScriptString } from '../tools/tools';

export const template = `
EDITOR.BehaviorCode.Constructors['{{name}}'] = function (scene, {{node}}, tools, mobile, require) {
var returnValue = null;
var exports = { };

{{code}}
${exportScriptString}
}
`;

// Set EDITOR on Window
export module EDITOR {
    export class BehaviorCode {
        public static Constructors = { };
    }
}
window['EDITOR'] = window['EDITOR'] || { };
window['EDITOR'].BehaviorCode = EDITOR.BehaviorCode;

/**
 * Generated interface defining an attached script
 */
export interface IEmbededScript {
    /**
     * The constructor reference of the script.
     */
    ctor: (new (...args: any[]) => any);
    /**
     * The id of the script.
     */
    id: string;
}

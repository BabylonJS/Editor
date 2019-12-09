import { exportScriptString } from '../tools/tools';

export const template = `
EDITOR.PostProcessCreator.Constructors['{{name}}'] = function (camera, tools, mobile) {
var returnValue = null;
var exports = { };

{{code}}
${exportScriptString}
}
`;

// Set EDITOR on Window
export module EDITOR {
    export class PostProcessCreator {
        public static Constructors = { };
    }
}
window['EDITOR'] = window['EDITOR'] || { };
window['EDITOR'].PostProcessCreator = EDITOR.PostProcessCreator;
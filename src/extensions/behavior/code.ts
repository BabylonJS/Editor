import { Scene, Node, DirectionalLight, HemisphericLight, Tools as BabylonTools, IParticleSystem, Vector4, Vector3, Vector2, Color4, Color3, Tools } from 'babylonjs';

import Tokenizer, { TokenType } from '../tools/tokenizer';
import { IStringDictionary } from '../typings/typings';

import Extensions from '../extensions';
import Extension from '../extension';

export interface BehaviorCode {
    code: string;
    compiledCode?: string;
    name: string;
    active: boolean;
    params?: any;
}

export interface BehaviorMetadata {
    node: string;
    metadatas: BehaviorCode[];
}

const template = `
EDITOR.BehaviorCode.Constructors['{{name}}'] = function (scene, {{node}}, tools, mobile) {
var returnValue = null;

{{code}}

function exportScript (value, params) {
    if (!params) {
        returnValue = value;
    } else {
        returnValue = {
            ctor: value
        };

        var keys = Object.keys(params);
        for (var i = 0; i < keys.length; i++) {
            returnValue[keys[i]] = params[keys[i]];
        }
    }
};

if (returnValue) {
    return returnValue;
}
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

// Code extension class
export default class CodeExtension extends Extension<BehaviorMetadata[]> {
    // Public members
    public instances: IStringDictionary<any> = { };
    
    /**
     * Constructor
     * @param scene: the babylonjs scene
     */
    constructor (scene: Scene) {
        super(scene);
        this.datas = [];
    }

    /**
     * On apply the extension
     */
    public onApply (data: BehaviorMetadata[]): void {
        this.datas = data;

        // For each node
        this.datas.forEach(d => {
            let node: Scene | Node | IParticleSystem = d.node === 'Scene' ? this.scene : this.scene.getNodeByName(d.node);

            if (!node)
                this.scene.particleSystems.forEach(ps => ps.name === d.node && (node = ps));
            
            if (!node)
                return;

            d.metadatas.forEach(m => {
                if (!m.active)
                    return;
                
                const ctor = this.getConstructor(m, node);

                // Instance
                const instance = new (ctor.ctor || ctor)();
                if (m.params)
                    this.setCustomParams(m, instance);

                // Save instance
                this.instances[(node instanceof Scene ? 'scene' : node.name) + m.name] = instance;

                // Run
                const scope = this;
                if (instance.start) {
                    this.scene.registerBeforeRender(function () {
                        instance.start();
                        scope.scene.unregisterBeforeRender(this.callback);
                    });
                }

                if (instance.update) {
                    this.scene.registerBeforeRender(function () {
                        instance.update();
                    });
                }
            });
        });
    }
    
    /**
     * Called by the editor when serializing the scene
     */
    public onSerialize (): BehaviorMetadata[] {
        const result: BehaviorMetadata[] = [];
        const add = (objects: (Scene | Node | IParticleSystem)[]) => {
            objects.forEach(o => {
                if (o['metadata'] && o['metadata']['behavior'])
                    result.push(o['metadata']['behavior']);
            });
        };

        add(this.scene.meshes);
        add(this.scene.lights);
        add(this.scene.cameras);
        add([this.scene]);
        add(this.scene.particleSystems);

        return result;
    }

    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    public onLoad (data: BehaviorMetadata[]): void {
        this.datas = data;
        
        // For each node
        this.datas.forEach(d => {
            const node = d.node === 'Scene' ? this.scene : this.scene.getNodeByName(d.node);
            if (!node)
                return;
            
            d.metadatas.forEach(m => {
                // TODO: set custom params
            });

            node.metadata = node.metadata || { };
            node.metadata['behavior'] = d;
        });
    }

    /**
     * Sets the custom params
     * @param m the behavior code structure
     * @param instance the instance
     */
    public setCustomParams (m: BehaviorCode, instance: any): void {
        for (const p in m.params) {
            const param = m.params[p];

            // Vector
            if (param.w !== undefined) {
                instance[p] = new Vector4(param.x, param.y, param.z, param.w);
            } else if (param.z !== undefined) {
                instance[p] = new Vector3(param.x, param.y, param.z);
            } else if (param.y !== undefined) {
                instance[p] = new Vector2(param.x, param.y);
            }
            // Color
            else if (param.a !== undefined) {
                instance[p] = new Color4(param.r, param.g, param.b, param.a);
            } else if (param.b !== undefined) {
                instance[p] = new Color3(param.r, param.g, param.b);
            }
            // Other
            else {
                instance[p] = m.params[p];
            }
        }
    }

    /**
     * Return the constructor
     * @param code the code metadata
     * @param node the attached node
     */
    public getConstructor (code: BehaviorCode, node: any): any {
        let url = window.location.href;
        url = url.replace(BabylonTools.GetFilename(url), '') + 'behaviors/' + (node instanceof Scene ? 'scene/' : node.name.replace(/ /g, '') + '/') + code.name.replace(/ /g, '') + '.js';

        const fnName = (node instanceof Scene ? 'scene' : node.name.replace(/ /g, '')) + code.name.replace(/ /g, '');

        // Create script tag
        Extension.AddScript(
            template.replace('{{name}}', fnName)
                    .replace('{{node}}', this._getEffectiveConstructorName(node))
                    .replace('{{code}}', code.compiledCode || code.code), url);

        // Constructor
        return EDITOR.BehaviorCode.Constructors[fnName](this.scene, node, Extensions.Tools, Extensions.Mobile);
    }

    /**
     * Returns the given object's constructor name
     * @param obj the instance
     */
    public getConstructorName (obj: any): string {
        const tokenizer = new Tokenizer(obj.toString());
        if (!tokenizer.matchIdentifier('function') && tokenizer.token !== TokenType.IDENTIFIER)
            return 'Unknown Constructor Name';

        return tokenizer.identifier;
    }

    // Return the effective constructor name used by scripts
    private _getEffectiveConstructorName (obj: any): string {
        if (obj instanceof DirectionalLight)
            return "dirlight";

        if (obj instanceof HemisphericLight)
            return "hemlight";

        let ctrName = (obj && obj.constructor) ? (<any>obj.constructor).name : "";
        
        if (ctrName === "") {
            ctrName = typeof obj;
        }
        
        return ctrName.toLowerCase();
    }

    // Returns a function parameters
    private _getFunctionParameters (fn: any): string[] {
        const tokenizer = new Tokenizer(fn.toString());
        const result: string[] = [];

        // function X (
        if (!tokenizer.matchIdentifier('function') || !tokenizer.match(TokenType.IDENTIFIER) || !tokenizer.match(TokenType.PARENTHESIS))
            return [];

        // Parameters X, Y
        while (!tokenizer.match(TokenType.PARENTHESIS)) {
            result.push(tokenizer.identifier);
            tokenizer.getNextToken();

            // ) or whatever
            if (!tokenizer.match(TokenType.COMMA))
                break;
        }

        return result;
    }
}

// Register
Extensions.Register('BehaviorExtension', CodeExtension);

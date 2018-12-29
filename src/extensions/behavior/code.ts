import {
    Scene, Node, DirectionalLight, HemisphericLight,
    Tools as BabylonTools, IParticleSystem, Vector4,
    Vector3, Vector2, Color4, Color3, Tools, GroundMesh,
    AbstractMesh, InstancedMesh
} from 'babylonjs';

import Tokenizer, { TokenType } from '../tools/tokenizer';
import { exportScriptString } from '../tools/tools';

import { IStringDictionary } from '../typings/typings';
import { IAssetComponent, AssetElement } from '../typings/asset';

import Extensions from '../extensions';
import Extension from '../extension';

export interface BehaviorCode {
    code: string;
    compiledCode?: string;
    name: string;
    id: string;
}

export interface BehaviorNodeCode {
    codeId: string;
    active: boolean;
    params?: any;
}

export interface BehaviorNodeMetadata {
    node: string;
    nodeId: string;
    metadatas: BehaviorNodeCode[];
}

export interface BehaviorMetadata {
    scripts: BehaviorCode[];
    nodes: BehaviorNodeMetadata[];
}

const template = `
EDITOR.BehaviorCode.Constructors['{{name}}'] = function (scene, {{node}}, tools, mobile) {
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

// Code extension class
export default class CodeExtension extends Extension<BehaviorMetadata> implements IAssetComponent {
    // Public members
    public id: string = 'behavior-editor';
    public assetsCaption: string = 'Scripts';

    public instances: IStringDictionary<any> = { };
    public scriptsConstructors: IStringDictionary<any> = { };

    // Static members
    public static Instance: CodeExtension = null;
    public static CurrentDatas: BehaviorMetadata = null;
    
    /**
     * Constructor
     * @param scene: the babylonjs scene
     */
    constructor (scene: Scene) {
        super(scene);
        this.datas = null;

        // Instance
        CodeExtension.Instance = this;
    }

    /**
     * Creates a new code asset
     */
    public async onCreateAsset (name: string): Promise<AssetElement<any>> {
        const code = await new Promise<string>((resolve) => {
            Tools.LoadFile('assets/templates/code/custom-code-typescript.ts', (data) => resolve(<string> data));
        });

        const asset = {
            name: name,
            data: <BehaviorCode> {
                code: code,
                id: Tools.RandomId(),
                name: name
            }
        };

        this.scene.metadata = this.scene.metadata || { };
        this.scene.metadata.behaviorScripts = this.scene.metadata.behaviorScripts || [];
        this.scene.metadata.behaviorScripts.push(asset.data);

        return asset;
    }

    /**
     * On the user renames the asset
     * @param asset the asset being renamed
     * @param name the new name of the asset
     */
    public onRenameAsset (asset: AssetElement<BehaviorCode>, name: string): void {
        asset.data.name = name;
    }

    /**
     * On get all the assets to be drawn in the assets component
     */
    public onGetAssets (): AssetElement<any>[] {
        const data = this.onSerialize();

        const attached: AssetElement<BehaviorCode>[] = [];
        const unAttached: AssetElement<BehaviorCode>[] = [];

        data.scripts.forEach(s => {
            const isAttached = data.nodes.find(n => n.metadatas.find(m => m.codeId === s.id) !== undefined);
            if (isAttached)
                return attached.push({ name: s.name, data: s });
            
            unAttached.push({ name: s.name, data: s });
        });

        const result = [<AssetElement<BehaviorCode>> { separator: 'Attached' }].concat(attached).concat([{ separator: 'Unattached' }]).concat(unAttached);

        return result;
    }

    /**
     * On the user drops an asset
     * @param targetMesh the target mesh under the pointer
     * @param asset the asset being dropped
     */
    public onDragAndDropAsset (targetMesh: AbstractMesh, asset: AssetElement<any>): void {
        targetMesh.metadata = targetMesh.metadata || { };

        if (!targetMesh.metadata.behavior) {
            targetMesh.metadata.behavior = {
                node: targetMesh.name,
                metadatas: []
            };
        }

        // Add asset
        targetMesh.metadata.behavior.metadatas.push({
            codeId: asset.data.id,
            active: true
        });
    }

    /**
     * On the user wants to remove the asset
     * @param asset the asset to remove
     */
    public onRemoveAsset (asset: AssetElement<any>): void {
        const data = <BehaviorCode> asset.data;

        // Remove links
        const remove = (objects: (Scene | Node | IParticleSystem)[]) => {
            objects.forEach(o => {
                if (!o['metadata'] || !o['metadata'].behavior)
                    return;
                
                const codes = <BehaviorNodeMetadata> o['metadata'].behavior;
                const links = codes.metadatas;
                for (let i  =0; i < links.length; i++) {
                    if (links[i].codeId === data.id) {
                        links.splice(i, 1);
                        i--;
                    }
                }
            });
        };

        remove(this.scene.meshes);
        remove(this.scene.lights);
        remove(this.scene.cameras);
        remove([this.scene]);
        remove(this.scene.particleSystems);

        // Remove data
        const index = this.scene.metadata.behaviorScripts.indexOf(data);

        if (index !== -1)
            this.scene.metadata.behaviorScripts.splice(index, 1);
    }

    /**
     * On the user adds an asset
     * @param asset the asset to add
     */
    public onAddAsset (asset: AssetElement<any>): void {
        this.scene.metadata.behaviorScripts.push(asset.data);
    }

    /**
     * On apply the extension
     */
    public onApply (data: BehaviorMetadata): void {
        this.datas = data;

        // For each node
        this.datas.scripts.forEach(s => {
            if (EDITOR.BehaviorCode.Constructors[s.name.replace(/ /g, '')])
                return;

            const isAttached = this.datas.nodes.find(n => n.metadatas.find(m => m.codeId === s.id) !== undefined);
            if (isAttached)
                return;
            
            const ctor = this.getConstructor(s, null);
            this.scriptsConstructors[s.name] = ctor;
        });

        this.datas.nodes.forEach(d => {
            let node: Scene | Node | IParticleSystem = d.node === 'Scene'
                ? this.scene
                : (this.scene.getNodeByID(d.nodeId) || this.scene.getNodeByName(d.node))

            if (!node)
                this.scene.particleSystems.forEach(ps => ps.name === d.node && (node = ps));
            
            if (!node)
                return;

            d.metadatas.forEach(m => {
                if (!m.active)
                    return;

                const code = this.datas.scripts.find(s => s.id === m.codeId);
                const ctor = this.getConstructor(code, node);

                // Warn?
                if (!ctor.ctor && typeof(ctor) !== 'function') {
                    const nodeName = node instanceof Scene ? 'Scene' : node.name;
                    return Tools.Warn(`Script named "${code.name}" has been ignored on object "${nodeName}" as there is no exported script. Please use "exportScript(ctor);"`);
                }

                // Instance
                const instance = new (ctor.ctor || ctor)();
                if (m.params)
                    this.setCustomParams(m, instance);

                // Save instance
                this.instances[(node instanceof Scene ? 'scene' : node.name) + code.name] = instance;

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
    public onSerialize (): BehaviorMetadata {
        const result = <BehaviorMetadata> {
            scripts: this.scene.metadata ? (this.scene.metadata.behaviorScripts || []) : [],
            nodes: []
        };

        const add = (objects: (Scene | Node | IParticleSystem)[]) => {
            objects.forEach(o => {
                if (o['metadata'] && o['metadata'].behavior) {
                    const behavior = <BehaviorNodeMetadata> o['metadata'].behavior;
                    behavior.node = o instanceof Scene ? 'Scene' :
                                    o instanceof Node ? o.name :
                                    o.id;
                    behavior.nodeId = o instanceof Scene ? 'Scene' : o.id;

                    result.nodes.push(behavior);
                }
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
    public onLoad (data: BehaviorMetadata): void {
        // Process old projects?
        if (!data.scripts) {
            const oldData = <any> data;

            data = {
                scripts: [],
                nodes: []
            };

            oldData.forEach(od => {
                const node = { node: od.node, nodeId: od.node, metadatas: [] };

                od.metadatas.forEach(m => {
                    const id = Tools.RandomId();
                    if (m.link)
                        return;
                    
                    data.scripts.push({ name: m.name, id: id, code: m.code, compiledCode: m.compiledCode });
                    
                    node.metadatas.push({
                        codeId: id,
                        active: m.active,
                        params: m.params
                    });
                });

                data.nodes.push(node);
            });
        }

        // Save
        this.datas = data;

        // Scene metadtas
        this.scene.metadata = this.scene.metadata || { };
        this.scene.metadata.behaviorScripts = this.datas.scripts;

        // For each node
        this.datas.nodes.forEach(d => {
            let node: Scene | Node | IParticleSystem = 
                d.node === 'Scene' ? this.scene :
                (this.scene.getNodeByID(d.nodeId) || this.scene.getNodeByName(d.node));

            if (!node)
                node = this.scene.getParticleSystemByID(d.node);
            
            if (!node)
                return;
            
            d.metadatas.forEach(m => {
                // TODO: set custom params
            });

            node['metadata'] = node['metadata'] || { };
            node['metadata'].behavior = d;
        });
    }

    /**
     * Sets the custom params
     * @param m the behavior code structure
     * @param instance the instance
     */
    public setCustomParams (m: BehaviorNodeCode, instance: any): void {
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
    public getConstructor (code: BehaviorCode, node: any, evaluate?: boolean): any {
        let url = window.location.href;
        url = url.replace(BabylonTools.GetFilename(url), '') + 'behaviors/';
        
        if (node)
            url += (node instanceof Scene ? 'scene/' : node.name.replace(/ /g, '') + '/') + code.name.replace(/ /g, '') + '.js';
        else
            url += code.name + '.js';

        const fnName = node ? (node instanceof Scene ? 'scene' : node.name.replace(/ /g, '')) + code.name.replace(/ /g, '') : code.name.replace(/ /g, '');
        const effectiveCode = template.replace('{{name}}', fnName)
                                      .replace('{{node}}', this._getEffectiveConstructorName(node))
                                      .replace('{{code}}', code.compiledCode || code.code);
        // Evaluate?
        if (evaluate)
            (new Function(effectiveCode))();
        // Create script tag
        else
            Extension.AddScript(effectiveCode, url);

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

    /**
     * Returns the final typescript code
     * @param code: the behavior code metadata
     * @param node: the attached node
     */
    public getFinalTypeScriptCode (code: BehaviorCode, node: any): string {
        const fnName = (node instanceof Scene ? 'scene' : node.name.replace(/ /g, '')) + code.name.replace(/ /g, '');

        return template.replace('{{name}}', fnName)
            .replace('{{node}}', this._getEffectiveConstructorName(node))
            .replace('{{code}}', code.code);
    }

    // Return the effective constructor name used by scripts
    private _getEffectiveConstructorName (obj: any): string {
        if (obj instanceof DirectionalLight)
            return 'dirlight';

        if (obj instanceof HemisphericLight)
            return 'hemlight';

        if (obj instanceof GroundMesh || obj instanceof InstancedMesh)
            return 'mesh';

        let ctrName = (obj && obj.constructor) ? (<any>obj.constructor).name : '';
        
        if (ctrName === '') {
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

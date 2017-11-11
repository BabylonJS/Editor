import { Scene, Node, DirectionalLight, HemisphericLight, Tools } from 'babylonjs';

import Extensions from '../extensions';
import Extension from '../extension';

export interface BehaviorCode {
    code: string;
    name: string;
    active: boolean;
}

export interface BehaviorMetadata {
    node: string;
    metadatas: BehaviorCode[];
}

const template = `
BABYLON.EDITOR.Constructors['{{name}}'] = function (scene, {{node}}) {
    {{code}}
}
`;

export default class CodeExtension extends Extension<BehaviorMetadata[]> {
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
    onApply (data: BehaviorMetadata[]): void {
        this.datas = data;

        // Create temporary variable
        BABYLON['EDITOR'] = {
            Constructors: { }
        };

        // For each node
        this.datas.forEach(d => {
            const node = d.node === 'Scene' ? this.scene : this.scene.getNodeByName(d.node);
            if (!node)
                return;

            d.metadatas.forEach(m => {
                if (!m.active)
                    return;

                let url = window.location.href;
                url = url.replace(Tools.GetFilename(url), '') + 'behaviors/' + (node instanceof Scene ? 'scene/' : node.name.replace(/ /g, '') + '/') + m.name.replace(/ /g, '') + '.js';

                const fnName = (node instanceof Scene ? 'scene' : node.name.replace(/ /g, '')) + m.name.replace(/ /g, '');

                // Create script tag
                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.text = template
                              .replace('{{name}}', fnName)
                              .replace('{{node}}', this._getConstructorName(node))
                              .replace('{{code}}', m.code)
                              + '\n' + '//# sourceURL=' + url + '\n'
                document.head.appendChild(script);

                // Create instance
                const instance = new BABYLON['EDITOR'].Constructors[fnName](this.scene, node);
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
    onSerialize (): BehaviorMetadata[] {
        const result: BehaviorMetadata[] = [];
        const add = (objects: (Scene | Node)[]) => {
            objects.forEach(o => {
                if (o.metadata && o.metadata['behavior'])
                    result.push(o.metadata['behavior']);
            });
        };

        add(this.scene.meshes);
        add(this.scene.lights);
        add(this.scene.cameras);
        add([this.scene]);

        return result;
    }

    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    onLoad (data: BehaviorMetadata[]): void {
        this.datas = data;
        
        // For each node
        this.datas.forEach(d => {
            const node = d.node === 'Scene' ? this.scene : this.scene.getNodeByName(d.node);
            if (!node)
                return;
            
            node.metadata = node.metadata || { };
            node.metadata['behavior'] = d;
        });
    }

    // Returns the name of the "obj" constructor
    private _getConstructorName(obj: any): string {
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
}

// Register
Extensions.Register('BehaviorExtension', CodeExtension);

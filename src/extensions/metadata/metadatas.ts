import { Scene, Node, IParticleSystem } from 'babylonjs';

import Extensions from '../extensions';
import Extension from '../extension';

export interface CustomMetadatas {
    node: string;
    nodeId: string;
    metadatas: any;
}

// Code extension class
export default class CustomMetadatasExtension extends Extension<CustomMetadatas[]> {
    /**
     * Constructor
     * @param scene the babylonjs scene
     */
    constructor (scene: Scene) {
        super(scene);
        this.datas = [];
    }

    /**
     * On apply the extension
     */
    public onApply (data: CustomMetadatas[]): void {
        this.datas = data;
        data.forEach(d => {
            const node =
                this.scene.getNodeByID(d.nodeId) || this.scene.getNodeByName(d.node) ||
                this.scene.getParticleSystemByID(d.nodeId);

            if (!node)
                return;
            
            node['metadata'] = d.metadatas;
        });
    }

    /**
     * Called by the editor when serializing the scene
     */
    public onSerialize (): CustomMetadatas[] {
        const result: CustomMetadatas[] = [];
        const add = (nodes: Array<Node | IParticleSystem>) => {
            nodes.forEach((n: Node | IParticleSystem) => {
                if (n['metadata'] && n['metadata'].customMetadatas) {
                    result.push({
                        nodeId: n.id,
                        node: n.name,
                        metadatas: n['metadata'].customMetadatas
                    });
                }
            });
        };

        add(this.scene.meshes);
        add(this.scene.lights);
        add(this.scene.cameras);
        add(this.scene.particleSystems);

        return result;
    }

    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    public onLoad (data: CustomMetadatas[]): void {
        this.datas = data;
        data.forEach(d => {
            const node =
                this.scene.getNodeByID(d.nodeId) || this.scene.getNodeByName(d.node) ||
                this.scene.getParticleSystemByID(d.nodeId);

            if (!node)
                return;
            
            node['metadata'] = node['metadata'] || { };
            node['metadata'].customMetadatas = d.metadatas;
        });
    }
}

// Register
Extensions.Register('CustomMetadatasExtension', CustomMetadatasExtension);

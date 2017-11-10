import { Scene } from 'babylonjs';

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
        debugger;
        this.datas = data;

        // For each node
        this.datas.forEach(d => {
            const node = this.scene.getNodeByName(d.node);
            if (!node)
                return;
            
            node.metadata = node.metadata || { };
            node.metadata['BehaviorExtension'] = d;

            d.metadatas.forEach(async m => {
                if (!m.active)
                    return;

                debugger;
            });
        });
    }
    
    /**
     * Called by the editor when serializing the scene
     */
    onSerialize (data: BehaviorMetadata[]): void {
        debugger;
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
            node.metadata['BehaviorExtension'] = d;
        });
    }
}

// Register
Extensions.Register('BehaviorExtension', CodeExtension);

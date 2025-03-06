import { ReactNode } from "react";

import { Scene, Node } from "babylonjs";

import { EditorInspectorNodeField } from "../../inspector/fields/node";
import { EditorInspectorSwitchField } from "../../inspector/fields/switch";

import { ICinematicKeyEventData } from "../schema/event";

export class CinematicEventSetEnabled implements ICinematicKeyEventData {
    public type: string = "set-enabled";

    public scene: Scene;
    public value: boolean;
    public node: Node | null;

    public constructor(scene: Scene, value?: boolean, nodeId?: string) {
        this.scene = scene;
        this.value = value ?? true;
        this.node = nodeId ? scene.getNodeById(nodeId) : null;
    }

    public serialize(): any {
        return {
            type: this.type,
            value: this.value,
            node: this.node?.id,
        };
    }

    public getInspector(): ReactNode {
        return (
            <>
                <EditorInspectorSwitchField object={this} property="value" label="Enabled" />
                <EditorInspectorNodeField object={this} property="node" scene={this.scene} label="Node" />
            </>
        );
    }

    public static parse(scene: Scene, config: any): CinematicEventSetEnabled {
        return new CinematicEventSetEnabled(scene, config.value, config.node);
    }
}

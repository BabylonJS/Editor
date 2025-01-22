import { Component, ReactNode } from "react";

import { AbstractMesh, PhysicsAggregate, PhysicsBody, PhysicsShapeType } from "babylonjs";

import { registerUndoRedo } from "../../../../tools/undoredo";

import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorSectionField } from "../fields/section";
import { EditorInspectorNumberField } from "../fields/number";

export interface IEditorMeshPhysicsInspectorProps {
    mesh: AbstractMesh;
}

export class EditorMeshPhysicsInspector extends Component<IEditorMeshPhysicsInspectorProps> {
    public render(): ReactNode {
        const o = {
            hasPhysicsBody: (this.props.mesh.physicsBody ?? null) !== null,
        };

        return (
            <EditorInspectorSectionField title="Physics">
                <EditorInspectorSwitchField object={o} property="hasPhysicsBody" label="Enabled" noUndoRedo onChange={() => this._handleHasPhysicsAggregateChange()} />

                {this.props.mesh.physicsBody &&
                    this._getPhysicsInspector(this.props.mesh.physicsBody)
                }
            </EditorInspectorSectionField>
        );
    }

    private _handleHasPhysicsAggregateChange(): void {
        const body = this.props.mesh.physicsBody;

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                this.props.mesh.physicsBody = body;
            },
            redo: () => {
                if (body) {
                    this.props.mesh.physicsBody = null;
                } else {
                    const aggregate = new PhysicsAggregate(this.props.mesh, this._getPhysicsShape(), {
                        mass: 1,
                    });
                    aggregate.body.disableSync = true;

                    this.props.mesh.physicsBody = aggregate.body;
                }
            },
        });

        this.forceUpdate();
    }

    private _getPhysicsShape(): PhysicsShapeType {
        if (this.props.mesh.metadata?.type === "Box") {
            return PhysicsShapeType.BOX;
        }

        return PhysicsShapeType.MESH;
    }

    private _getPhysicsInspector(body: PhysicsBody): ReactNode {
        const material = body.shape?.material;
        const massProperties = body.getMassProperties();

        return (
            <>
                <EditorInspectorNumberField object={massProperties} property="mass" label="Mass" min={0} onChange={() => body.computeMassProperties()} />
                <EditorInspectorNumberField object={material} property="friction" label="Friction" min={0} max={1} />
            </>
        );
    }
}

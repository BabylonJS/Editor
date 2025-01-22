import { Component, ReactNode } from "react";

import { AbstractMesh, PhysicsAggregate, PhysicsShapeType } from "babylonjs";

import { registerUndoRedo } from "../../../../tools/undoredo";

import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";

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

                {this.props.mesh.physicsAggregate &&
                    this._getPhysicsInspector(this.props.mesh.physicsAggregate)
                }
            </EditorInspectorSectionField>
        );
    }

    private _handleHasPhysicsAggregateChange(): void {
        const aggregate = this.props.mesh.physicsAggregate;

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                this.props.mesh.physicsAggregate = aggregate;
                this.props.mesh.physicsBody = aggregate?.body ?? null;
            },
            redo: () => {
                if (aggregate) {
                    this.props.mesh.physicsBody = null;
                    this.props.mesh.physicsAggregate = null;
                } else {
                    const aggregate = new PhysicsAggregate(this.props.mesh, this._getPhysicsShape(), {
                        mass: 1,
                    });
                    aggregate.body.disableSync = true;

                    this.props.mesh.physicsAggregate = aggregate;
                }
            },
        });

        this.forceUpdate();
    }

    private _getPhysicsShape(): PhysicsShapeType {
        switch (this.props.mesh.metadata?.type) {
            case "Box":
            case "Ground":
                return PhysicsShapeType.BOX;
        }

        return PhysicsShapeType.MESH;
    }

    private _getPhysicsInspector(aggregate: PhysicsAggregate): ReactNode {
        const material = aggregate.material;
        const massProperties = aggregate.body.getMassProperties();

        return (
            <>
                <EditorInspectorNumberField object={massProperties} property="mass" label="Mass" min={0} onChange={() => aggregate.body.setMassProperties({
                    ...aggregate.body.getMassProperties(),
                    mass: massProperties.mass,
                })} />
                <EditorInspectorNumberField object={material} property="friction" label="Friction" min={0} max={1} />
                <EditorInspectorNumberField object={material} property="restitution" label="Restitution" min={0} max={1} />
            </>
        );
    }
}

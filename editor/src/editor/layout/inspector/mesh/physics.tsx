import { Component, ReactNode } from "react";

import { Divider } from "@blueprintjs/core";

import { AbstractMesh, PhysicsAggregate, PhysicsShape, PhysicsShapeType, PhysicsMotionType } from "babylonjs";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { isGroundMesh, isInstancedMesh, isMesh } from "../../../../tools/guards/nodes";

import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";
import { EditorInspectorListField, IEditorInspectorListFieldItem } from "../fields/list";

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
        const mesh = isInstancedMesh(this.props.mesh)
            ? this.props.mesh.sourceMesh
            : this.props.mesh;

        switch (mesh.metadata?.type) {
            case "Box":
            case "Ground":
                return PhysicsShapeType.BOX;

            case "Sphere":
                return PhysicsShapeType.SPHERE;
        }

        return PhysicsShapeType.MESH;
    }

    private _getPhysicsInspector(aggregate: PhysicsAggregate): ReactNode {
        const material = aggregate.shape.material;
        const massProperties = aggregate.body.getMassProperties();

        return (
            <>
                <Divider />

                {this._getShapeTypeInspector(aggregate)}
                {this._getBodyMotionTypeInspeector(aggregate)}

                <Divider />

                {aggregate.body.getMotionType() !== PhysicsMotionType.STATIC &&
                    <EditorInspectorNumberField noUndoRedo object={massProperties} property="mass" label="Mass" min={0} onFinishChange={(value, oldValue) => {
                        registerUndoRedo({
                            executeRedo: true,
                            undo: () => {
                                aggregate.body.setMassProperties({
                                    ...aggregate.body.getMassProperties(),
                                    mass: oldValue,
                                });
                            },
                            redo: () => {
                                aggregate.body.setMassProperties({
                                    ...aggregate.body.getMassProperties(),
                                    mass: value,
                                });
                            },
                        });

                        this.forceUpdate();
                    }} />
                }

                <EditorInspectorNumberField object={material} property="friction" label="Friction" min={0} max={1} />
                <EditorInspectorNumberField object={material} property="restitution" label="Restitution" min={0} max={1} />
            </>
        );
    }

    private _getShapeTypeInspector(aggregate: PhysicsAggregate): ReactNode {
        const o = {
            type: aggregate.shape.type,
        };

        const items: IEditorInspectorListFieldItem[] = [
            { text: "Box", value: PhysicsShapeType.BOX },
            { text: "Sphere", value: PhysicsShapeType.SPHERE },
            { text: "Capsule", value: PhysicsShapeType.CAPSULE },
            { text: "Cylinder", value: PhysicsShapeType.CYLINDER },
            { text: "Mesh", value: PhysicsShapeType.MESH },
        ];

        return (
            <EditorInspectorListField noUndoRedo object={o} property="type" label="Shape Type" items={items} onChange={(value, oldValue) => {
                registerUndoRedo({
                    executeRedo: true,
                    undo: () => {
                        aggregate.shape = new PhysicsShape({
                            type: oldValue,
                            parameters: {
                                mesh: oldValue === PhysicsShapeType.MESH && isMesh(this.props.mesh) ? this.props.mesh : undefined,
                                groundMesh: oldValue === PhysicsShapeType.HEIGHTFIELD && isGroundMesh(this.props.mesh) ? this.props.mesh : undefined,
                            },
                        }, this.props.mesh.getScene());

                        aggregate.body.disableSync = true;
                    },
                    redo: () => {
                        aggregate.shape = new PhysicsShape({
                            type: value,
                            parameters: {
                                mesh: value === PhysicsShapeType.MESH && isMesh(this.props.mesh) ? this.props.mesh : undefined,
                                groundMesh: value === PhysicsShapeType.HEIGHTFIELD && isGroundMesh(this.props.mesh) ? this.props.mesh : undefined,
                            },
                        }, this.props.mesh.getScene());

                        aggregate.body.disableSync = true;
                    },
                });
            }} />
        );
    }

    private _getBodyMotionTypeInspeector(aggregate: PhysicsAggregate): ReactNode {
        const o = {
            type: aggregate.body.getMotionType(),
        };

        return (
            <EditorInspectorListField noUndoRedo object={o} property="type" label="Shape Type" items={[
                { text: "Static", value: PhysicsMotionType.STATIC },
                { text: "Dynamic", value: PhysicsMotionType.DYNAMIC },
                { text: "Animated", value: PhysicsMotionType.ANIMATED },
            ]} onChange={(value, oldValue) => {
                registerUndoRedo({
                    executeRedo: true,
                    undo: () => {
                        aggregate.body.setMotionType(oldValue);
                        aggregate.body.disableSync = true;
                    },
                    redo: () => {
                        aggregate.body.setMotionType(value);
                        aggregate.body.disableSync = true;
                    },
                });

                this.forceUpdate();
            }} />
        );
    }
}

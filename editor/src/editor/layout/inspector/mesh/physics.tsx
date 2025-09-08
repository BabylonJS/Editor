import { shell } from "electron";

import { Component, ReactNode } from "react";

import { Divider } from "@blueprintjs/core";

import { AbstractMesh, PhysicsAggregate, PhysicsShape, PhysicsShapeType, PhysicsMotionType, PhysicsMassProperties } from "babylonjs";

import { isMesh } from "../../../../tools/guards/nodes";
import { registerUndoRedo } from "../../../../tools/undoredo";
import { getPhysicsShapeForMesh } from "../../../../tools/physics/shape";

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
			<EditorInspectorSectionField
				title="Physics"
				tooltip={
					<div>
						Configure physics using Havok. Can be used also for{" "}
						<b
							className="underline underline-offset-2"
							onClick={() => shell.openExternal("https://doc.babylonjs.com/features/featuresDeepDive/physics/characterController")}
						>
							advanced collisions
						</b>
						.
					</div>
				}
			>
				<EditorInspectorSwitchField object={o} property="hasPhysicsBody" label="Enabled" noUndoRedo onChange={() => this._handleHasPhysicsAggregateChange()} />

				{this.props.mesh.physicsAggregate && this._getPhysicsInspector(this.props.mesh.physicsAggregate)}
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

					if (this.props.mesh.metadata.physicsAggregate) {
						delete this.props.mesh.metadata.physicsAggregate;
					}
				} else {
					const aggregate = new PhysicsAggregate(this.props.mesh, getPhysicsShapeForMesh(this.props.mesh), {
						mass: 1,
					});
					aggregate.body.disableSync = true;

					this.props.mesh.physicsAggregate = aggregate;
				}
			},
		});

		this.forceUpdate();
	}

	private _getPhysicsInspector(aggregate: PhysicsAggregate): ReactNode {
		const material = aggregate.shape.material;
		const massProperties = aggregate.body.getMassProperties();

		const setMassProperties = (properties: Partial<PhysicsMassProperties>) => {
			aggregate.body.setMassProperties({
				...aggregate.body.getMassProperties(),
				...properties,
			});
		};

		return (
			<>
				<Divider />

				{this._getShapeTypeInspector(aggregate)}
				{this._getBodyMotionTypeInspeector(aggregate)}

				<Divider />

				{aggregate.body.getMotionType() !== PhysicsMotionType.STATIC && (
					<EditorInspectorNumberField
						noUndoRedo
						object={massProperties}
						property="mass"
						label="Mass"
						min={0}
						onFinishChange={(value, oldValue) => {
							registerUndoRedo({
								executeRedo: true,
								undo: () => setMassProperties({ mass: oldValue }),
								redo: () => setMassProperties({ mass: value }),
							});

							this.forceUpdate();
						}}
					/>
				)}

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

		const configureShape = (value: PhysicsShapeType) => {
			aggregate.shape = new PhysicsShape(
				{
					type: value,
					parameters: {
						mesh: value === PhysicsShapeType.MESH && isMesh(this.props.mesh) ? this.props.mesh : undefined,
					},
				},
				this.props.mesh.getScene()
			);

			aggregate.body.disableSync = true;
		};

		return (
			<EditorInspectorListField
				noUndoRedo
				object={o}
				property="type"
				label="Shape Type"
				items={items}
				onChange={(value, oldValue) => {
					registerUndoRedo({
						executeRedo: true,
						undo: () => configureShape(oldValue),
						redo: () => configureShape(value),
					});
				}}
			/>
		);
	}

	private _getBodyMotionTypeInspeector(aggregate: PhysicsAggregate): ReactNode {
		const o = {
			type: aggregate.body.getMotionType(),
		};

		const configureMotionType = (value: PhysicsMotionType) => {
			aggregate.body.setMotionType(value);
			aggregate.body.disableSync = true;
		};

		return (
			<EditorInspectorListField
				noUndoRedo
				object={o}
				property="type"
				label="Shape Type"
				items={[
					{ text: "Static", value: PhysicsMotionType.STATIC },
					{ text: "Dynamic", value: PhysicsMotionType.DYNAMIC },
					{ text: "Animated", value: PhysicsMotionType.ANIMATED },
				]}
				onChange={(value, oldValue) => {
					registerUndoRedo({
						executeRedo: true,
						undo: () => configureMotionType(oldValue),
						redo: () => configureMotionType(value),
					});

					this.forceUpdate();
				}}
			/>
		);
	}
}

import { Nullable } from "../../../shared/types";

import * as React from "react";

import { Mesh, QuadraticErrorSimplification } from "babylonjs";

import { InspectorNumber } from "../../editor/gui/inspector/fields/number";
import { InspectorButton } from "../../editor/gui/inspector/fields/button";
import { InspectorBoolean } from "../../editor/gui/inspector/fields/boolean";
import { InspectorSection } from "../../editor/gui/inspector/fields/section";

import { CollisionsSettings } from "./settings";

export interface ICollisionsInspectorProps {
	/**
	 * Defines the reference to the mesh to edit its collisions properties.
	 */
	mesh: Nullable<Mesh>;
	/**
	 * Defines the reference to the collider mesh.s
	 */
	colliderMesh: Nullable<Mesh>;

	/**
	 * Defines the type of collisions.
	 */
	collisionType: string;

	/**
	 * Defines the callback called on the overlay should be shown on the tool.
	 */
	onShowOverlay: (showOverlay: boolean) => void;
}

export class CollisionsInspector extends React.Component<ICollisionsInspectorProps> {
	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		if (!this.props.mesh) {
			return <></>;
		}

		switch (this.props.collisionType) {
			case "Cube":
			case "Sphere":
				return (
					<InspectorSection title={this.props.collisionType}>
						<InspectorNumber object={this.props.mesh.scaling} property="x" label="Size X"  noUndoRedo min={0} step={0.01} />
						<InspectorNumber object={this.props.mesh.scaling} property="y" label="Size Y" noUndoRedo min={0} step={0.01} />
						<InspectorNumber object={this.props.mesh.scaling} property="z" label="Size Z" noUndoRedo min={0} step={0.01} />
					</InspectorSection>
				);

			case "LOD":
				return (
					<InspectorSection title="Lod">
						<InspectorNumber object={CollisionsSettings.SimplificationSettings} property="quality" label="Quality" noUndoRedo min={0.01} max={1} step={0.01} />
						<InspectorBoolean object={CollisionsSettings.SimplificationSettings} property="optimizeMesh" label="Optimize Mesh" noUndoRedo />

						<InspectorButton label="Compute..." onClick={() => this._handleComputeLod()} />

						<InspectorSection title="Infos">
							<span>Source mesh: {this.props.mesh.geometry?.getTotalVertices() ?? 0} vertices</span>
							<span>Collider mesh: {this.props.colliderMesh?.geometry?.getTotalVertices() ?? 0} vertices</span>
						</InspectorSection>
					</InspectorSection>
				);

			default:
				return (
					<span>
						No properties avaiable for this mode.
					</span>
				);
		}
	}

	/**
	 * Called on the user wants to compute the LOD
	 */
	private _handleComputeLod(): void {
		if (!this.props.mesh || !this.props.colliderMesh) {
			return;
		}

		this.props.onShowOverlay(true);
		this.props.mesh.geometry?.applyToMesh(this.props.colliderMesh);

		const decimator = new QuadraticErrorSimplification(this.props.colliderMesh);
		decimator.simplify({ ...CollisionsSettings.SimplificationSettings }, (sm) => {
			if (this.props.colliderMesh) {
				sm.geometry?.applyToMesh(this.props.colliderMesh);
			}

			sm.dispose(false, false);
			this.props.onShowOverlay(false);

			this.forceUpdate();
		});
	}
}
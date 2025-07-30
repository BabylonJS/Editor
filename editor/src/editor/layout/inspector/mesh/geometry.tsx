import { Component, ReactNode } from "react";

import { CreateBoxVertexData, CreateSphereVertexData, CreateGroundVertexData, Mesh } from "babylonjs";

import { EditorInspectorListField } from "../fields/list";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";

export interface IMeshGeometryInspectorProps {
	object: Mesh;
}

export class MeshGeometryInspector extends Component<IMeshGeometryInspectorProps> {
	public render(): ReactNode {
		if (this.props.object.metadata?.type === "Box") {
			return this._getBoxInspectorComponent();
		}

		if (this.props.object.metadata?.type === "Sphere") {
			return this._getSphereInspectorComponent();
		}

		if (this.props.object.metadata?.type === "Ground") {
			return this._getGroundInspectorComponent();
		}

		return null;
	}

	private _getBoxInspectorComponent(): ReactNode {
		const proxy = this._getProxy(() => {
			this.props.object.geometry?.setAllVerticesData(
				CreateBoxVertexData({
					width: this.props.object.metadata.width,
					height: this.props.object.metadata.height,
					depth: this.props.object.metadata.depth,
					sideOrientation: this.props.object.metadata.sideOrientation,
				}),
				false
			);
		});

		return (
			<EditorInspectorSectionField title="Box">
				<EditorInspectorNumberField object={proxy} property="width" label="Width" step={0.1} />
				<EditorInspectorNumberField object={proxy} property="height" label="Height" step={0.1} />
				<EditorInspectorNumberField object={proxy} property="depth" label="Depth" step={0.1} />
				<EditorInspectorListField
					object={proxy}
					property="sideOrientation"
					label="Side Orientation"
					items={[
						{ text: "Front", value: Mesh.FRONTSIDE },
						{ text: "Back", value: Mesh.BACKSIDE },
					]}
				/>
			</EditorInspectorSectionField>
		);
	}

	private _getSphereInspectorComponent(): ReactNode {
		const proxy = this._getProxy(() => {
			this.props.object.geometry?.setAllVerticesData(
				CreateSphereVertexData({
					diameter: this.props.object.metadata.diameter,
					segments: this.props.object.metadata.segments,
					sideOrientation: this.props.object.metadata.sideOrientation,
				}),
				false
			);
		});

		return (
			<EditorInspectorSectionField title="Sphere">
				<EditorInspectorNumberField object={proxy} property="diameter" label="Diameter" step={0.1} min={0.01} />
				<EditorInspectorNumberField object={proxy} property="segments" label="Segments" step={0.1} min={2} />
				<EditorInspectorListField
					object={proxy}
					property="sideOrientation"
					label="Side Orientation"
					items={[
						{ text: "Front", value: Mesh.FRONTSIDE },
						{ text: "Back", value: Mesh.BACKSIDE },
					]}
				/>
			</EditorInspectorSectionField>
		);
	}

	private _getGroundInspectorComponent(): ReactNode {
		const proxy = this._getProxy(() => {
			this.props.object.geometry?.setAllVerticesData(
				CreateGroundVertexData({
					width: this.props.object.metadata.width,
					height: this.props.object.metadata.height,
					subdivisions: this.props.object.metadata.subdivisions >> 0,
				}),
				false
			);
		});

		return (
			<EditorInspectorSectionField title="Ground">
				<EditorInspectorNumberField object={proxy} property="width" label="Width" step={0.1} />
				<EditorInspectorNumberField object={proxy} property="height" label="Height" step={0.1} />
				<EditorInspectorNumberField object={proxy} property="subdivisions" label="Subdivisions" step={1} min={1} />
			</EditorInspectorSectionField>
		);
	}

	private _getProxy<T>(onChange: () => void): T {
		return new Proxy(this.props.object.metadata, {
			get(target, prop) {
				return target[prop];
			},
			set(obj, prop, value) {
				obj[prop] = value;
				onChange();
				return true;
			},
		});
	}
}

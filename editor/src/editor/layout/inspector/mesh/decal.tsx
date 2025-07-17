import { Component, ReactNode } from "react";

import { IoIosWarning } from "react-icons/io";

import { Mesh, MeshBuilder, Vector3 } from "babylonjs";

import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";

export interface IMeshDecalInspectorProps {
	object: Mesh;
}

export interface IMeshDecalInspectorState {
	meshExists: boolean;
}

export class MeshDecalInspector extends Component<IMeshDecalInspectorProps, IMeshDecalInspectorState> {
	public constructor(props: IMeshDecalInspectorProps) {
		super(props);

		this.state = {
			meshExists: true,
		};
	}

	public render(): ReactNode {
		if (!this.props.object.metadata?.decal) {
			return null;
		}

		const proxy = this._getProxy(() => {
			this._handleUpdateCurrentDecalMesh();
		});

		return (
			<EditorInspectorSectionField title="Decal">
				<EditorInspectorNumberField object={proxy} property="sizeX" step={1} label="Width" onChange={() => this._handleUpdateCurrentDecalMesh()} />
				<EditorInspectorNumberField object={proxy} property="sizeY" step={1} label="Height" onChange={() => this._handleUpdateCurrentDecalMesh()} />

				<EditorInspectorNumberField asDegrees object={proxy} property="angle" step={0.1} label="Angle" onChange={() => this._handleUpdateCurrentDecalMesh()} />

				{!this.state.meshExists &&
					<div className="flex justify-center items-center gap-2">
						<IoIosWarning size="24px" />

						<div className="text-yellow-500">
							Source mesh not found.
						</div>
					</div>
				}
			</EditorInspectorSectionField>
		);
	}

	public componentDidMount(): void {
		if (this.props.object.metadata?.decal) {
			const scene = this.props.object.getScene();
			const mesh = scene.getMeshById(this.props.object.metadata.decal.meshId);

			if (!mesh) {
				this.setState({ meshExists: false });
			}
		}
	}

	private _handleUpdateCurrentDecalMesh(): void {
		const scene = this.props.object.getScene();
		const mesh = scene.getMeshById(this.props.object.metadata.decal.meshId);
		if (!mesh) {
			return;
		}

		const configuration = this.props.object.metadata.decal;

		this.props.object.geometry?.releaseForMesh(this.props.object);

		const decal = MeshBuilder.CreateDecal("decal", mesh, {
			localMode: true,
			angle: configuration.angle,
			size: new Vector3(configuration.sizeX, configuration.sizeY, configuration.sizeZ),
			position: Vector3.FromArray(configuration.position),
			normal: configuration.normal ? Vector3.FromArray(configuration.normal) : undefined,
		});

		decal.geometry?.applyToMesh(this.props.object);
		decal.dispose(false, false);
	}

	private _getProxy<T>(onChange: () => void): T {
		return new Proxy(this.props.object.metadata.decal, {
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

import { toast } from "sonner";

import { HeightMapUtils } from "../../../../tools/mesh/height-map";
import { Component, ReactNode } from "react";

import { CreateBoxVertexData, CreateSphereVertexData, Mesh } from "babylonjs";

import { EditorInspectorListField } from "../fields/list";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";
import { EditorInspectorTextureField } from "../fields/texture";
import { EditorInspectorSwitchField } from "../fields/switch";

import { onNodeModifiedObservable } from "../../../../tools/observables";

export interface IMeshGeometryInspectorProps {
	object: Mesh;
}

export class MeshGeometryInspector extends Component<IMeshGeometryInspectorProps> {
	private static readonly _maxSubdivisions = 1024;

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
		this.props.object.metadata = HeightMapUtils.prepareGroundForInspector(this.props.object, this.props.object.metadata, MeshGeometryInspector._maxSubdivisions);

		return (
			<>
				<EditorInspectorSectionField title="Ground">
					<EditorInspectorNumberField
						object={this.props.object.metadata}
						property="width"
						label="Width"
						step={0.1}
						onChange={() => {
							const ok = HeightMapUtils.handleGroundPropertyChange(
								this.props.object,
								this.props.object.metadata,
								"width",
								this.props.object.metadata.width,
								MeshGeometryInspector._maxSubdivisions
							);
							if (ok) {
								onNodeModifiedObservable.notifyObservers(this.props.object);
								this.forceUpdate();
							}
						}}
					/>
					<EditorInspectorNumberField
						object={this.props.object.metadata}
						property="height"
						label="Height"
						step={0.1}
						onChange={() => {
							const ok = HeightMapUtils.handleGroundPropertyChange(
								this.props.object,
								this.props.object.metadata,
								"height",
								this.props.object.metadata.height,
								MeshGeometryInspector._maxSubdivisions
							);
							if (ok) {
								onNodeModifiedObservable.notifyObservers(this.props.object);
								this.forceUpdate();
							}
						}}
					/>
					<EditorInspectorNumberField
						object={this.props.object.metadata}
						property="subdivisions"
						label="Subdivisions"
						step={1}
						min={1}
						onChange={() => {
							const ok = HeightMapUtils.handleGroundPropertyChange(
								this.props.object,
								this.props.object.metadata,
								"subdivisions",
								this.props.object.metadata.subdivisions,
								MeshGeometryInspector._maxSubdivisions
							);
							if (ok) {
								onNodeModifiedObservable.notifyObservers(this.props.object);
								this.forceUpdate();
							}
						}}
					/>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Height Map">
					<EditorInspectorTextureField
						title="Height Map Texture"
						object={this.props.object.metadata}
						property="heightMapTexture"
						scene={this.props.object.getScene()}
						onChange={(texture) => {
							try {
								HeightMapUtils.handleInspectorHeightMapTextureChanged(texture, this.props.object.metadata, MeshGeometryInspector._maxSubdivisions, () =>
									this.forceUpdate()
								);
								if (!texture) {
									void HeightMapUtils.revertToFlatGround(this.props.object, this.props.object.metadata, MeshGeometryInspector._maxSubdivisions);
								}
								onNodeModifiedObservable.notifyObservers(this.props.object);
							} catch (error) {
								console.error("Error handling height map texture change:", error);
								toast.error(`Failed to handle height map texture change: ${(error as any).message}`);
							}
						}}
					/>

					{this.props.object.metadata.heightMapTexture && (
						<>
							<EditorInspectorNumberField
								object={this.props.object.metadata}
								property="minHeight"
								label="Min Height"
								step={0.1}
								onChange={async () => {
									try {
										const result = await HeightMapUtils.reapplyHeightMapOnly(
											this.props.object,
											this.props.object.metadata,
											MeshGeometryInspector._maxSubdivisions,
											() => this.forceUpdate(),
											(error) => toast.error(`Failed to reapply height map: ${error}`)
										);
										if (result.success || result.usedFallback) {
											onNodeModifiedObservable.notifyObservers(this.props.object);
										} else {
											toast.error(`Failed to reapply height map: ${result.error}`);
										}
									} catch (error) {
										console.error("Error updating height map property: minHeight:", error);
										toast.error(`Failed to update height map property: ${(error as any).message}`);
									}
								}}
							/>
							<EditorInspectorNumberField
								object={this.props.object.metadata}
								property="maxHeight"
								label="Max Height"
								step={0.1}
								onChange={async () => {
									try {
										const result = await HeightMapUtils.reapplyHeightMapOnly(
											this.props.object,
											this.props.object.metadata,
											MeshGeometryInspector._maxSubdivisions,
											() => this.forceUpdate(),
											(error) => toast.error(`Failed to reapply height map: ${error}`)
										);
										if (result.success || result.usedFallback) {
											onNodeModifiedObservable.notifyObservers(this.props.object);
										} else {
											toast.error(`Failed to reapply height map: ${result.error}`);
										}
									} catch (error) {
										console.error("Error updating height map property: maxHeight:", error);
										toast.error(`Failed to update height map property: ${(error as any).message}`);
									}
								}}
							/>
							<EditorInspectorSwitchField
								object={this.props.object.metadata}
								property="useHeightMap"
								label="Use Height Map"
								onChange={async () => {
									try {
										const result = await HeightMapUtils.toggleInspectorHeightMap(
											this.props.object,
											this.props.object.metadata,
											this.props.object.metadata.useHeightMap,
											MeshGeometryInspector._maxSubdivisions,
											() => this.forceUpdate()
										);
										if (result.success) {
											onNodeModifiedObservable.notifyObservers(this.props.object);
										} else {
											toast.error(`Failed to toggle height map: ${result.error}`);
										}
									} catch (error) {
										console.error("Error toggling height map:", error);
										toast.error(`Failed to toggle height map: ${(error as any).message}`);
									}
								}}
							/>
						</>
					)}
				</EditorInspectorSectionField>
			</>
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

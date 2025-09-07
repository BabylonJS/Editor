import { Component, ReactNode } from "react";

import { AbstractMesh } from "babylonjs";
import { WaterMaterial } from "babylonjs-materials";

import { EditorInspectorColorField } from "../fields/color";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";
import { EditorInspectorTextureField } from "../fields/texture";

import { EditorMaterialInspectorUtilsComponent } from "./components/utils";
import { Switch } from "../../../../ui/shadcn/ui/switch";
import { EditorInspectorVectorField } from "../fields/vector";

export interface IEditorWaterMaterialInspectorProps {
	mesh?: AbstractMesh;
	material: WaterMaterial;
}

export interface IEditorWaterMaterialInspectorState {
	renderListSearch: string;
}

export class EditorWaterMaterialInspector extends Component<IEditorWaterMaterialInspectorProps, IEditorWaterMaterialInspectorState> {
	public constructor(props: IEditorWaterMaterialInspectorProps) {
		super(props);

		this.state = {
			renderListSearch: "",
		};
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="Material" label={this.props.material.getClassName()}>
					<EditorInspectorStringField label="Name" object={this.props.material} property="name" />
					<EditorInspectorSwitchField label="Back Face Culling" object={this.props.material} property="backFaceCulling" />

					<EditorMaterialInspectorUtilsComponent mesh={this.props.mesh} material={this.props.material} />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Water">
					<EditorInspectorTextureField hideLevel object={this.props.material} title="Normal Texture" property="bumpTexture" onChange={() => this.forceUpdate()}>
						<EditorInspectorNumberField label="Bump Height" object={this.props.material} property="bumpHeight" />
					</EditorInspectorTextureField>
				</EditorInspectorSectionField>

				{this.props.material.bumpTexture && (
					<>
						<EditorInspectorSectionField title="Colors">
							<EditorInspectorColorField label={<div className="w-14">Color 1</div>} object={this.props.material} property="waterColor" />
							<EditorInspectorColorField label={<div className="w-14">Color 2</div>} object={this.props.material} property="waterColor2" />
							<EditorInspectorNumberField label="Color Blend Factor" object={this.props.material} property="colorBlendFactor" min={0} max={1} />
							<EditorInspectorNumberField label="Color Blend Factor 2" object={this.props.material} property="colorBlendFactor2" min={0} max={1} />

							<EditorInspectorColorField label={<div className="w-14">Diffuse</div>} object={this.props.material} property="diffuseColor" />
							<EditorInspectorColorField label={<div className="w-14">Specular</div>} object={this.props.material} property="specularColor" />
						</EditorInspectorSectionField>

						<EditorInspectorSectionField title="Reflection">
							<input
								type="text"
								placeholder="Search..."
								value={this.state.renderListSearch}
								onChange={(e) => this.setState({ renderListSearch: e.currentTarget.value })}
								className="px-5 py-2 rounded-lg bg-primary-foreground outline-none w-full"
							/>

							<div className="flex flex-col w-full max-h-96 p-2 rounded-lg bg-card overflow-x-hidden overflow-y-auto">
								{this.props.material
									.getScene()
									.meshes.filter((mesh) => mesh.name.toLowerCase().includes(this.state.renderListSearch.toLowerCase()))
									.map((mesh) => this._getRenderListItem(mesh))}
							</div>
						</EditorInspectorSectionField>
					</>
				)}

				<EditorInspectorSectionField title="Options">
					<EditorInspectorNumberField label="Wave Length" object={this.props.material} property="waveLength" />

					<EditorInspectorNumberField label="Wind Force" object={this.props.material} property="windForce" />
					<EditorInspectorVectorField label="Wind Direction" object={this.props.material} property="windDirection" step={0.1} />

					<EditorInspectorSwitchField label="Bump Super Impose" object={this.props.material} property="bumpSuperimpose" />
					<EditorInspectorSwitchField label="Fresnel Separate" object={this.props.material} property="fresnelSeparate" />
					<EditorInspectorSwitchField label="Bump Affects Reflection" object={this.props.material} property="bumpAffectsReflection" />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Misc">
					<EditorInspectorSwitchField label="Disable Lighting" object={this.props.material} property="disableLighting" />
					<EditorInspectorSwitchField label="Separate Culling Pass" object={this.props.material} property="separateCullingPass" />
					<EditorInspectorNumberField label="Z Offset" object={this.props.material} property="zOffset" />
					<EditorInspectorNumberField label="Z Offset Units" object={this.props.material} property="zOffsetUnits" />
					<EditorInspectorSwitchField label="Fog Enabled" object={this.props.material} property="fogEnabled" />
				</EditorInspectorSectionField>
			</>
		);
	}

	private _getRenderListItem(mesh: AbstractMesh): ReactNode {
		if (mesh === this.props.mesh) {
			return undefined;
		}

		return (
			<div key={mesh.id} className="flex items-center gap-2 hover:bg-muted transition-all duration-300 ease-in-out p-2 rounded-lg">
				<Switch
					defaultChecked={this.props.material.reflectionTexture?.renderList?.includes(mesh)}
					onCheckedChange={(checked) => {
						if (checked) {
							this.props.material.addToRenderList(mesh);
						} else {
							this.props.material.removeFromRenderList(mesh);
						}
					}}
				/>
				<div>{mesh.name}</div>
			</div>
		);
	}
}

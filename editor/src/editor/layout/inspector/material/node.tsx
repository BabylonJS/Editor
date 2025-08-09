import { readJSON } from "fs-extra";
import { ipcRenderer } from "electron";
import { dirname, join } from "path/posix";

import { Component, ReactNode } from "react";

import { Grid } from "react-loader-spinner";

import { AbstractMesh, NodeMaterial, Observer, InputBlock, NodeMaterialBlockConnectionPointTypes } from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";

import { normalizedGlob } from "../../../../tools/fs";
import { sortAlphabetically } from "../../../../tools/tools";

import { projectConfiguration } from "../../../../project/configuration";

import { EditorInspectorColorField } from "../fields/color";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorVectorField } from "../fields/vector";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";

import { EditorMaterialInspectorUtilsComponent } from "./components/utils";

export interface IEditorNodeMaterialInspectorProps {
	mesh?: AbstractMesh;
	material: NodeMaterial;
}

export interface IEditorNodeMaterialInspectorState {
	searchingToEdit: boolean;
}

export class EditorNodeMaterialInspector extends Component<IEditorNodeMaterialInspectorProps, IEditorNodeMaterialInspectorState> {
	private _buildObserver: Observer<NodeMaterial> | null = null;

	public constructor(props: IEditorNodeMaterialInspectorProps) {
		super(props);

		this.state = {
			searchingToEdit: false,
		};
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="Material" label={this.props.material.getClassName()}>
					<EditorInspectorStringField label="Name" object={this.props.material} property="name" />
					<EditorInspectorSwitchField label="Back Face Culling" object={this.props.material} property="backFaceCulling" />

					<EditorMaterialInspectorUtilsComponent mesh={this.props.mesh} material={this.props.material} />

					<Button variant="default" disabled={this.state.searchingToEdit} className="flex gap-2 items-center w-full" onClick={() => this._openNodeMaterialEditor()}>
						{this.state.searchingToEdit && (
							<div className="dark:invert">
								<Grid width={14} height={14} color="#ffffff" />
							</div>
						)}
						Edit...
					</Button>
				</EditorInspectorSectionField>

				{this._getEditableBlocks()}
			</>
		);
	}

	public componentDidMount(): void {
		this._buildObserver = this.props.material.onBuildObservable.add(() => {
			this.forceUpdate();
		});
	}

	public componentWillUnmount(): void {
		this.props.material.onBuildObservable.remove(this._buildObserver);
	}

	private async _openNodeMaterialEditor(): Promise<void> {
		// TODO: Unfortunately we need to search for the material file in the project so it will be
		// edited for the NME. Try to keep the material file somewhere to avoid searching for it each time.
		this.setState({
			searchingToEdit: true,
		});

		const projectPath = dirname(projectConfiguration.path!);
		const materialFiles = await normalizedGlob(join(projectPath, "assets/**/*.material"), {
			nodir: true,
		});

		await Promise.all(
			materialFiles.map(async (filePath) => {
				try {
					const data = await readJSON(filePath, {
						encoding: "utf-8",
					});

					if (data.customType === "BABYLON.NodeMaterial" && data.uniqueId === this.props.material.uniqueId) {
						ipcRenderer.send("window:open", "build/src/editor/windows/nme", {
							filePath,
						});
					}
				} catch (e) {
					// Catch silently
				}
			})
		);

		this.setState({
			searchingToEdit: false,
		});
	}

	private _getEditableBlocks(): ReactNode[] {
		const result: ReactNode[] = [];

		const uniforms = this.props.material.getInputBlocks().filter((b) => b.visibleInInspector);
		if (!uniforms.length) {
			return result;
		}

		// Build groups
		const groupsDictionary: Record<string, InputBlock[]> = {};
		uniforms.forEach((uniform) => {
			const group = uniform.groupInInspector ?? "";

			if (!groupsDictionary[group]) {
				groupsDictionary[group] = [];
			}

			groupsDictionary[group].push(uniform);
		});

		const keys = sortAlphabetically(Object.keys(groupsDictionary));

		return keys.map((key) => {
			const group = groupsDictionary[key];

			return (
				<EditorInspectorSectionField key={key} title={key || "No Group"}>
					{group?.map((uniform) => {
						switch (uniform.type) {
							case NodeMaterialBlockConnectionPointTypes.Float:
							case NodeMaterialBlockConnectionPointTypes.Int:
								return (
									<EditorInspectorNumberField
										object={uniform}
										property="value"
										label={uniform.name}
										min={uniform.min}
										max={uniform.max}
										step={uniform.type === NodeMaterialBlockConnectionPointTypes.Int ? 1 : 0.01}
										tooltip={uniform.comments}
									/>
								);

							case NodeMaterialBlockConnectionPointTypes.Vector2:
							case NodeMaterialBlockConnectionPointTypes.Vector3:
							case NodeMaterialBlockConnectionPointTypes.Vector4:
								return <EditorInspectorVectorField object={uniform} property="value" label={uniform.name} tooltip={uniform.comments} />;

							case NodeMaterialBlockConnectionPointTypes.Color3:
							case NodeMaterialBlockConnectionPointTypes.Color4:
								return <EditorInspectorColorField object={uniform} property="value" label={uniform.name} tooltip={uniform.comments} />;

							default:
								return null;
						}
					})}
				</EditorInspectorSectionField>
			);
		});
	}
}

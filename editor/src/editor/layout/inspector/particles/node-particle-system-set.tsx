import { readJSON } from "fs-extra";
import { ipcRenderer } from "electron";
import { dirname, join } from "path/posix";

import { Grid } from "react-loader-spinner";
import { Component, ReactNode } from "react";

import { Button } from "../../../../ui/shadcn/ui/button";

import { NodeParticleSystemSetMesh } from "../../../nodes/node-particle-system";

import { getProjectAssetsRootUrl, projectConfiguration } from "../../../../project/configuration";

import { normalizedGlob } from "../../../../tools/fs";
import { onNodeModifiedObservable } from "../../../../tools/observables";
import { isNodeParticleSystemSetMesh } from "../../../../tools/guards/particles";

import { EditorTransformNodeInspector } from "../transform";

import { ScriptInspectorComponent } from "../script/script";

import { IEditorInspectorImplementationProps } from "../inspector";

import { EditorInspectorVectorField } from "../fields/vector";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSectionField } from "../fields/section";

export interface IEditorNodeParticleSystemSetMeshInspectorState {
	searchingToEdit: boolean;
}

export class EditorNodeParticleSystemSetMeshInspector extends Component<
	IEditorInspectorImplementationProps<NodeParticleSystemSetMesh>,
	IEditorNodeParticleSystemSetMeshInspectorState
> {
	/**
	 * Returns whether or not the given object is supported by this inspector.
	 * @param object defines the object to check.
	 * @returns true if the object is supported by this inspector.
	 */
	public static IsSupported(object: unknown): boolean {
		return isNodeParticleSystemSetMesh(object);
	}

	public constructor(props: IEditorInspectorImplementationProps<NodeParticleSystemSetMesh>) {
		super(props);

		this.state = {
			searchingToEdit: false,
		};
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="Common">
					<EditorInspectorStringField
						label="Name"
						object={this.props.object}
						property="name"
						onChange={() => onNodeModifiedObservable.notifyObservers(this.props.object)}
					/>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Transforms">
					<EditorInspectorVectorField label={<div className="w-14">Position</div>} object={this.props.object} property="position" />
					{EditorTransformNodeInspector.GetRotationInspector(this.props.object)}
					<EditorInspectorVectorField label={<div className="w-14">Scaling</div>} object={this.props.object} property="scaling" />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Particle System Set">
					<Button
						variant="default"
						disabled={this.state.searchingToEdit}
						className="flex gap-2 items-center w-full"
						onClick={() => this._openNodeParticleSystemSetEditor()}
					>
						{this.state.searchingToEdit && (
							<div className="dark:invert">
								<Grid width={14} height={14} color="#ffffff" />
							</div>
						)}
						Edit...
					</Button>
				</EditorInspectorSectionField>

				<ScriptInspectorComponent editor={this.props.editor} object={this.props.object} />
			</>
		);
	}

	private async _openNodeParticleSystemSetEditor(): Promise<void> {
		if (!this.props.object.nodeParticleSystemSet?.id) {
			return;
		}

		// TODO: Unfortunately we need to search for the material file in the project so it will be
		// edited for the NME. Try to keep the material file somewhere to avoid searching for it each time.
		this.setState({
			searchingToEdit: true,
		});

		const projectPath = dirname(projectConfiguration.path!);
		const materialFiles = await normalizedGlob(join(projectPath, "assets/**/*.npss"), {
			nodir: true,
		});

		await Promise.all(
			materialFiles.map(async (filePath) => {
				try {
					const data = await readJSON(filePath, {
						encoding: "utf-8",
					});

					if (data.customType === "BABYLON.NodeParticleSystemSet" && data.id === this.props.object.nodeParticleSystemSet!.id) {
						ipcRenderer.send("window:open", "build/src/editor/windows/npe", {
							filePath,
							rootUrl: getProjectAssetsRootUrl() ?? undefined,
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
}

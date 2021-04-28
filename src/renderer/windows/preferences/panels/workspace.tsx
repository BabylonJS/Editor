import * as React from "react";
import { FileInput } from "@blueprintjs/core";

import { InspectorNumber } from "../../../editor/gui/inspector/fields/number";
import { InspectorSection } from "../../../editor/gui/inspector/fields/section";
import { InspectorBoolean } from "../../../editor/gui/inspector/fields/boolean";

import { IPreferencesPanelProps } from "../index";

export class WorkspacePreferencesPanel extends React.Component<IPreferencesPanelProps> {
	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		const workspace = this.props.preferences.state.workspace;
		if (!workspace) {
			return null;
		}

		workspace.ktx2CompressedTextures ??= {};

		return (
			<div style={{ width: "50%", height: "100%", margin: "auto" }}>
				<InspectorSection title="Project">
					<InspectorBoolean object={workspace} property="generateSceneOnSave" label="Generate Scene On Save" defaultValue={true} />
					<InspectorBoolean object={workspace} property="useIncrementalLoading" label="Save Scene As Binary File (Incremental Loading)" defaultValue={false} />
				</InspectorSection>

				<InspectorSection title="WebPack">
					<InspectorBoolean object={workspace} property="watchProject" label="Watch Project Automatically" defaultValue={true} />
				</InspectorSection>

				<InspectorSection title="Web Server">
					<InspectorNumber object={workspace} property="serverPort" label="Server Port" min={0} step={1} />
				</InspectorSection>

				<InspectorSection title="KTX2 Compression">
					<InspectorBoolean object={workspace.ktx2CompressedTextures} property="enabled" label="Enabled" defaultValue={false} />
					<FileInput text={workspace.ktx2CompressedTextures?.pvrTexToolCliPath || "None"} fill={true} buttonText="Browse" onInputChange={(e) => this._handlePVRTexToolCLIPathChanged(e)} />
				</InspectorSection>
			</div>
		);
	}

	/**
	 * Called on the user changes the terminal path to use in the editor.
	 */
	private _handlePVRTexToolCLIPathChanged(e: React.FormEvent<HTMLInputElement>): void {
		const files = (e.target as HTMLInputElement).files;
		if (!files?.length) { return; }

		this.props.preferences.state.workspace!.ktx2CompressedTextures!.pvrTexToolCliPath = files.item(0)!.path;
		this.forceUpdate();
	}
}

import * as React from "react";

import { InspectorNumber } from "../../../editor/gui/inspector/fields/number";
import { InspectorSection } from "../../../editor/gui/inspector/fields/section";
import { InspectorBoolean } from "../../../editor/gui/inspector/fields/boolean";
import { InspectorFileInput } from "../../../editor/gui/inspector/fields/file-input";

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

		workspace.https ??= {
			enabled: false,
		};

		return (
			<div style={{ width: "70%", height: "100%", margin: "auto" }}>
				<InspectorSection title="Project">
					<InspectorBoolean object={workspace} property="generateSceneOnSave" label="Generate Scene On Save" defaultValue={true} />
				</InspectorSection>

				<InspectorSection title="WebPack">
					<InspectorBoolean object={workspace} property="watchProject" label="Watch Project Automatically" defaultValue={true} />
				</InspectorSection>

				<InspectorSection title="Web Server">
					<InspectorNumber object={workspace} property="serverPort" label="Server Port" min={0} step={1} />
					<InspectorSection title="HTTPS">
						<InspectorBoolean object={workspace.https} property="enabled" label="Enabled" defaultValue={false} />
						<InspectorFileInput object={workspace.https} property="certPath" label="Certificate" />
						<InspectorFileInput object={workspace.https} property="keyPath" label="Key" />
					</InspectorSection>
				</InspectorSection>
			</div>
		);
	}
}

import * as React from "react";

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

		return (
			<div style={{ width: "100%", height: "100%" }}>
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
			</div>
		);
	}
}

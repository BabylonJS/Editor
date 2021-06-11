import * as React from "react";

import { InspectorSection } from "../../../../editor/gui/inspector/fields/section";
import { InspectorBoolean } from "../../../../editor/gui/inspector/fields/boolean";

import { IPreferencesPanelProps } from "../../index";

export class AssetsGeometriesPreferencesPanel extends React.Component<IPreferencesPanelProps> {
	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		const workspace = this.props.preferences.state.workspace;
		if (!workspace) {
			return null;
		}

		return (
			<div style={{ width: "70%", height: "100%", margin: "auto" }}>
				<InspectorSection title="Geometries">
					<InspectorBoolean object={workspace} property="useIncrementalLoading" label="Save Scene As Binary File (Incremental Loading)" defaultValue={false} />
				</InspectorSection>
			</div>
		);
	}
}

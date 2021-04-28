import * as React from "react";
import { Button, FileInput } from "@blueprintjs/core";

import { Tools } from "../../../editor/tools/tools";

import { InspectorList } from "../../../editor/gui/inspector/fields/list";
import { InspectorNumber } from "../../../editor/gui/inspector/fields/number";
import { InspectorButton } from "../../../editor/gui/inspector/fields/button";
import { InspectorBoolean } from "../../../editor/gui/inspector/fields/boolean";
import { InspectorSection } from "../../../editor/gui/inspector/fields/section";

import { IPreferencesPanelProps } from "../index";

export class EditorPreferencesPanel extends React.Component<IPreferencesPanelProps> {
	private _zoom: number = 1;

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		this._zoom = parseFloat(this.props.preferences.state.editor.zoom ?? "1.0");

		return (
			<div style={{ width: "50%", height: "100%", margin: "auto" }}>
				<InspectorSection title="User Interface">
					<InspectorNumber object={this} property="_zoom" label="Size" min={0.5} max={2} step={0.1} onFinishChange={() => {
						this.props.preferences.setState({ editor: { ...this.props.preferences.state.editor, zoom: this._zoom.toString() } })
					}} />
				</InspectorSection>

				<InspectorSection title="Preview Panel">
					<InspectorSection title="Rendering">
						<InspectorList object={this.props.preferences.state.editor} property="scalingLevel" label="Rendering Quality" items={[
							{ label: "Low Quality", data: 2 },
							{ label: "Regular Quality", data: 1 },
							{ label: "High Quality", data: 0.5 },
						]} />
						<InspectorBoolean object={this.props.preferences.state.editor} property="noOverlayOnDrawElement" label="No Selected Node Overlay" defaultValue={false} />
					</InspectorSection>
					<InspectorSection title="Gizmos">
						{this._getSnappingValues()}
						<InspectorButton label="Add" onClick={() => this._handleAddSnappingValue()} />
					</InspectorSection>
				</InspectorSection>

				<InspectorSection title="Terminal">
					<FileInput text={this.props.preferences.state.editor.terminalPath ?? "Default"} fill={true} buttonText="Browse" onInputChange={(e) => this._handleTerminalPathChanged(e)} />
				</InspectorSection>

				<InspectorSection title="Developers">
					<InspectorBoolean object={this.props.preferences.state.editor} property="developerMode" label="Enable Electron Dev Tools" defaultValue={false} />
				</InspectorSection>
			</div>
		);
	}

	/**
	 * Returns the inspector used to render snapping values.
	 */
	private _getSnappingValues(): React.ReactNode {
		const steps = this.props.preferences.state.editor.positionGizmoSnapping ?? [0, 1, 2, 5, 10];

		this.props.preferences.state.editor.positionGizmoSnapping = steps;

		return steps.map((s, index) => {
			const editableObject = { value: s };
			return (
				<div key={Tools.RandomId()} style={{ width: "100%", height: "35px" }}>
					<InspectorNumber key={Tools.RandomId()} object={editableObject} property="value" label={index.toString()} min={0} step={0.01} onFinishChange={(v) => this._handleSnappingValueChanged(v, index)} />
					<Button key={Tools.RandomId()} text="" icon="remove" small={true} style={{ position: "absolute", marginTop: "-22px", marginLeft: "-15px" }} onClick={() => this._handleSnappingRemoveValue(index)} />
				</div>
			);
		});
	}

	/**
	 * Called on the user changes a snapping value.
	 */
	private _handleSnappingValueChanged(value: number, index: number): void {
		const steps = this.props.preferences.state.editor.positionGizmoSnapping;
		if (!steps) {
			return;
		}

		steps[index] = value;
		steps.sort((a, b) => a - b);

		this.forceUpdate();
	}

	/**
	 * Called on the user wants to remove an existing snapping step.
	 */
	private _handleSnappingRemoveValue(index: number): void {
		const steps = this.props.preferences.state.editor.positionGizmoSnapping;
		if (!steps || steps.length === 1) {
			return;
		}

		steps.splice(index, 1);
		this.forceUpdate();
	}

	/**
	 * Called on the user wants to add a new snapping step.
	 */
	private _handleAddSnappingValue(): void {
		const steps = this.props.preferences.state.editor.positionGizmoSnapping;
		if (!steps) {
			return;
		}

		steps.push(steps[steps.length - 1] + 1);
		this.forceUpdate();
	}

	/**
	 * Called on the user changes the terminal path to use in the editor.
	 */
	private _handleTerminalPathChanged(e: React.FormEvent<HTMLInputElement>): void {
		const files = (e.target as HTMLInputElement).files;
        if (!files?.length) { return; }

        this.props.preferences.setState({ editor: { ...this.props.preferences.state.editor, terminalPath: files.item(0)!.path } });
		this.forceUpdate();
	}
}

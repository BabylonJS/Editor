import { Component, ReactNode } from "react";
import { Divider } from "@blueprintjs/core";

import { HemisphericLight } from "babylonjs";

import { isHemisphericLight } from "../../../../tools/guards/nodes";
import { onNodeModifiedObservable } from "../../../../tools/observables";

import { IEditorInspectorImplementationProps } from "../inspector";

import { EditorInspectorListField } from "../fields/list";
import { EditorInspectorColorField } from "../fields/color";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorVectorField } from "../fields/vector";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";

import { ScriptInspectorComponent } from "../script/script";
import { CustomMetadataInspector } from "../metadata/custom-metadata";

export class EditorHemisphericLightInspector extends Component<IEditorInspectorImplementationProps<HemisphericLight>> {
	/**
	 * Returns whether or not the given object is supported by this inspector.
	 * @param object defines the object to check.
	 * @returns true if the object is supported by this inspector.
	 */
	public static IsSupported(object: unknown): boolean {
		return isHemisphericLight(object);
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="Common">
					<div className="flex justify-between items-center px-2 py-2">
						<div className="w-1/2">Type</div>

						<div className="text-white/50 w-full">{this.props.object.getClassName()}</div>
					</div>
					<EditorInspectorStringField
						label="Name"
						object={this.props.object}
						property="name"
						onChange={() => onNodeModifiedObservable.notifyObservers(this.props.object)}
					/>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Transforms">
					<EditorInspectorVectorField label={<div className="w-14">Direction</div>} object={this.props.object} property="direction" />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Light">
					<EditorInspectorColorField label={<div className="w-14">Ground</div>} object={this.props.object} property="groundColor" />
					<EditorInspectorColorField label={<div className="w-14">Diffuse</div>} object={this.props.object} property="diffuse" />
					<EditorInspectorColorField label={<div className="w-14">Specular</div>} object={this.props.object} property="specular" />

					<Divider />

					<EditorInspectorNumberField label="Intensity" object={this.props.object} property="intensity" />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Lightmaps">
					<EditorInspectorListField
						label="Mode"
						object={this.props.object}
						property="lightmapMode"
						items={[
							{ text: "Default", value: HemisphericLight.LIGHTMAP_DEFAULT },
							{ text: "Specular", value: HemisphericLight.LIGHTMAP_SPECULAR },
							{ text: "Shadowmap Only", value: HemisphericLight.LIGHTMAP_SHADOWSONLY },
						]}
					/>
				</EditorInspectorSectionField>

				<ScriptInspectorComponent editor={this.props.editor} object={this.props.object} />

				<CustomMetadataInspector object={this.props.object} />
			</>
		);
	}
}

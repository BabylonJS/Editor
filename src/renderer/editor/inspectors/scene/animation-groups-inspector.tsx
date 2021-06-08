import * as React from "react";

import { Scene } from "babylonjs";

import { Inspector } from "../../components/inspector";

import { InspectorSection } from "../../gui/inspector/fields/section";

import { AbstractInspector } from "../abstract-inspector";
import { AnimationGroupComponent } from "../tools/animation-groups";

export class SceneAnimationGroupsInspector extends AbstractInspector<Scene, {}> {
	/**
	 * Renders the content of the inspector.
	 */
	public renderContent(): React.ReactNode {
		return (
			<InspectorSection title="Animation Groups">
				<AnimationGroupComponent scene={this.selectedObject} height="450px" />
			</InspectorSection>
		);
	}
}

Inspector.RegisterObjectInspector({
    ctor: SceneAnimationGroupsInspector,
    ctorNames: ["Scene"],
    title: "Animation Groups",
});

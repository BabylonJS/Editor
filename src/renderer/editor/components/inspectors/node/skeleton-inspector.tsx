import * as React from "react";

import { Skeleton } from "babylonjs";

import { InspectorButton } from "../../../gui/inspector/fields/button";
import { InspectorString } from "../../../gui/inspector/fields/string";
import { InspectorSection } from "../../../gui/inspector/fields/section";
import { InspectorBoolean } from "../../../gui/inspector/fields/boolean";

import { AbstractInspector } from "../abstract-inspector";
import { Inspector, IObjectInspectorProps } from "../../inspector";

export interface ISkeletonInspectorState {

}

export class SkeletonInspector extends AbstractInspector<Skeleton, ISkeletonInspectorState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.state = {
            ...this.state,
        };
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        this.selectedObject.needInitialSkinMatrix ??= false;

        return (
            <InspectorSection title="Skeleton">
                <InspectorString object={this.selectedObject} property="name" label="Name" onFinishChange={() => this.editor.graph.refresh()} />
                <InspectorBoolean object={this.selectedObject} property="needInitialSkinMatrix" label="Need Initial Skin Matrix" />
                <InspectorBoolean object={this.selectedObject} property="useTextureToStoreBoneMatrices" label="Use Texture To Store Bone Matrices" />

                {this._getSkeletonAnimationRangesInspector()}
            </InspectorSection>
        );
    }

    /**
     * Returns the skeleton animation ranges inspector used to play the animations.
     */
     private _getSkeletonAnimationRangesInspector(): React.ReactNode {
        const ranges = this.selectedObject?.getAnimationRanges();
        if (!ranges?.length) {
            return undefined;
        }

        const buttons = ranges.filter((r) => r?.name).map((r) => (
            <InspectorButton label={r!.name} onClick={() => {
                this.selectedObject.getScene().stopAnimation(this.selectedObject);
                this.selectedObject?.beginAnimation(r!.name, true, 1.0);
            }} />
        ));

        return (
            <InspectorSection title="Animation Ranges">
                {buttons}
            </InspectorSection>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: SkeletonInspector,
    ctorNames: ["Skeleton"],
    title: "Skeleton",
});

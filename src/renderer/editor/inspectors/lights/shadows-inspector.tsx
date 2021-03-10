import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { DirectionalLight, SpotLight, PointLight, ShadowGenerator, CascadedShadowGenerator } from "babylonjs";

import { Inspector, IObjectInspectorProps } from "../../components/inspector";

import { InspectorSection } from "../../gui/inspector/section";
import { InspectorBoolean } from "../../gui/inspector/boolean";

import { Confirm } from "../../gui/confirm";

import { AbstractInspector } from "../abstract-inspector";

export interface IShadowInspectorState {
    /**
     * Defines wether or not shadows are enabled.
     */
    enabled: boolean;
}

export class ShadowsInspector extends AbstractInspector<DirectionalLight | SpotLight | PointLight, IShadowInspectorState> {
    /**
     * Defines the reference to the shadow generator being editor.
     */
    protected shadowGenerator: Nullable<ShadowGenerator> = null;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.state = {
            enabled: this.selectedObject.getShadowGenerator() !== null,
        };
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        this.shadowGenerator = this.selectedObject.getShadowGenerator() as ShadowGenerator;

        return (
            <>
                {this.getCommonInspector()}
            </>
        );
    }

    /**
     * Returns the common inspector used to enable/disable shadows and configure common
     * properties.
     */
    protected getCommonInspector(): React.ReactNode {
        if (!this.shadowGenerator) {
            return (
                <InspectorSection title="Common">
                    <InspectorBoolean object={this.state} property="enabled" label="Enabled" onChange={(v) => this._handleShadowEnable(v)} />
                </InspectorSection>
            );
        }

        return (
            <InspectorSection title="Common">
                <InspectorBoolean object={this.state} property="enabled" label="Enabled" onChange={(v) => this._handleShadowEnable(v)} />
                <InspectorBoolean object={this.shadowGenerator} property="enableSoftTransparentShadow" label="Enable Soft Transparent Shadow" />
                <InspectorBoolean object={this.shadowGenerator} property="transparencyShadow" label="Enable Transparency Shadow" />
            </InspectorSection>
        );
    }

    /**
     * Called on the user enables/disables shadows on the light.
     */
    private async _handleShadowEnable(enabled: boolean): Promise<void> {
        if (!enabled) {
            this.shadowGenerator?.dispose();
        } else {
            if (this.selectedObject instanceof DirectionalLight) {
                const cascaded = await Confirm.Show("Use Cascaded Shadow Mapping?", "Would you like to create Cascaded Shadow Maps? Cascaded Shadow Maps are optimized for large scenes.");
                cascaded ? new CascadedShadowGenerator(1024, this.selectedObject, true) : new ShadowGenerator(1024, this.selectedObject, true);
            } else {
                new ShadowGenerator(1024, this.selectedObject, true);
            }
        }

        this.setState({ enabled });
    }
}

Inspector.RegisterObjectInspector({
    ctor: ShadowsInspector,
    ctorNames: ["DirectionalLight", "SpotLight", "PointLight"],
    title: "Shadows",
});

import { Nullable } from "../../../../shared/types";

import * as React from "react";

import {
    DirectionalLight, SpotLight, PointLight, ShadowGenerator, CascadedShadowGenerator,
} from "babylonjs";

import { Inspector, IObjectInspectorProps } from "../../components/inspector";

import { InspectorList } from "../../gui/inspector/fields/list";
import { InspectorNumber } from "../../gui/inspector/fields/number";
import { InspectorSection } from "../../gui/inspector/fields/section";
import { InspectorBoolean } from "../../gui/inspector/fields/boolean";

import { Confirm } from "../../gui/confirm";

import { AbstractInspector } from "../abstract-inspector";

import { MeshTransferComponent } from "../tools/transfer-mesh";

export interface IShadowInspectorState {
    /**
     * Defines wether or not shadows are enabled.
     */
    enabled: boolean;
    /**
     * Defines the current size of the shadow map.
     */
    shadowMapSize: Nullable<number>;
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
            enabled: (this.selectedObject.getShadowGenerator() ?? null) !== null,
            shadowMapSize: this.selectedObject.getShadowGenerator()?.getShadowMap()?.getSize()?.width ?? null,
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
                {this.getShadowsInspector()}
                {this.getIncludedMeshesInspector()}
            </>
        );
    }

    /**
     * Returns the common inspector used to enable/disable shadows and configure common
     * properties.
     */
    protected getCommonInspector(): React.ReactNode {
        if (!this.shadowGenerator?.getShadowMap()) {
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
                <InspectorNumber object={this.shadowGenerator.getShadowMap()} property="refreshRate" label="Refresh Rate" min={0} step={1} />
                <InspectorList object={this.state} property="shadowMapSize" label="Size" items={[
                    { label: "256", data: 256 },
                    { label: "512", data: 512 },
                    { label: "1024", data: 1024 },
                    { label: "2048", data: 2048 },
                    { label: "4096", data: 4096 },
                ]} onChange={(v: number) => {
                    this.shadowGenerator?.getShadowMap()?.resize(v);
                    this.setState({ shadowMapSize: v });
                }} />
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

    /**
     * Returns the shadows generator inspector that handles both common and cascaded
     * shadows generators.
     */
    protected getShadowsInspector(): React.ReactNode {
        if (this.shadowGenerator instanceof CascadedShadowGenerator) {
            return this.getCascadedShadowsInspector();
        }

        if (this.shadowGenerator instanceof ShadowGenerator) {
            return this.getShadowsCommonInspector();
        }

        return undefined;
    }

    /**
     * In case of common shadows, returns the inspector used to configure the shadows
     * generator properties.
     */
    protected getShadowsCommonInspector(): React.ReactNode {
        const shadowGenerator = this.shadowGenerator as ShadowGenerator;

        return (
            <InspectorSection title="Shadows">
                <InspectorNumber object={shadowGenerator} property="darkness" label="Darkness" step={0.01} min={0} max={1} />
                <InspectorNumber object={shadowGenerator} property="bias" label="Bias" step={0.0000001} />

                <InspectorSection title="Blur">
                    <InspectorNumber object={shadowGenerator} property="blurBoxOffset" label="Blur Box Offset" min={0} max={10} step={1} />
                    <InspectorNumber object={shadowGenerator} property="blurScale" label="Blur Scale" min={0} max={16} step={1} />
                    <InspectorBoolean object={shadowGenerator} property="useKernelBlur" label="Use Kernel Blur" />
                    <InspectorNumber object={shadowGenerator} property="blurScale" label="Kernel Blur" min={0} max={512} step={1} />
                </InspectorSection>

                <InspectorSection title="Flags">
                    <InspectorBoolean object={shadowGenerator} property="usePoissonSampling" label="Use Poisson Sampling" />
                    <InspectorBoolean object={shadowGenerator} property="useExponentialShadowMap" label="Use Exponential" />
                    <InspectorBoolean object={shadowGenerator} property="useBlurExponentialShadowMap" label="Use Blur Exponential" />
                    <InspectorBoolean object={shadowGenerator} property="useCloseExponentialShadowMap" label="Use Close Exponential" />
                    <InspectorBoolean object={shadowGenerator} property="useBlurCloseExponentialShadowMap" label="Use Blur Close Exponential" />
                </InspectorSection>
            </InspectorSection>
        );
    }

    /**
     * In case of cascaded shadows, returns the inspector used to configure the cascaded shadows
     * generator properties.
     */
    protected getCascadedShadowsInspector(): React.ReactNode {
        const cascadedShadowGenerator = this.shadowGenerator as CascadedShadowGenerator;

        return (
            <InspectorSection title="Cascaded Shadows">
                <InspectorNumber object={cascadedShadowGenerator} property="darkness" label="Darkness" step={0.01} min={0} max={1} />
                <InspectorNumber object={cascadedShadowGenerator} property="bias" label="Bias" step={0.0000001} />
                <InspectorNumber object={cascadedShadowGenerator} property="normalBias" label="Normal Bias" step={0.0000001} />
                <InspectorNumber object={cascadedShadowGenerator} property="frustumEdgeFalloff" label="Frustum Edge Falloff" step={0.0000001} />
                <InspectorBoolean object={cascadedShadowGenerator} property="stabilizeCascades" label="Stabilize Cascades" />

                <InspectorSection title="Percentage Closer Filtering">
                    <InspectorBoolean object={cascadedShadowGenerator} property="usePercentageCloserFiltering" label="Enabled" />
                    <InspectorList object={cascadedShadowGenerator} property="filteringQuality" label="Quality" items={[
                        { label: "Low", data: CascadedShadowGenerator.QUALITY_LOW },
                        { label: "Medium", data: CascadedShadowGenerator.QUALITY_MEDIUM },
                        { label: "High", data: CascadedShadowGenerator.QUALITY_HIGH },
                    ]} />
                </InspectorSection>

                <InspectorSection title="Contact Hardening">
                    <InspectorBoolean object={cascadedShadowGenerator} property="useContactHardeningShadow" label="Enabled" />
                    <InspectorNumber object={cascadedShadowGenerator} property="contactHardeningLightSizeUVRatio" label="Light Size UV Ratio" step={0.001} />
                </InspectorSection>

                <InspectorBoolean object={cascadedShadowGenerator} property="forceBackFacesOnly" label="Force Back Faces Only" />
                <InspectorBoolean object={cascadedShadowGenerator} property="depthClamp" label="Depth Clamp" />
                <InspectorNumber object={cascadedShadowGenerator} property="lambda" label="Lambda" min={0} max={1} step={0.001} />
                <InspectorNumber object={cascadedShadowGenerator} property="penumbraDarkness" label="Penumbra Darkness" min={0} max={1} step={0.001} />
                <InspectorNumber object={cascadedShadowGenerator} property="cascadeBlendPercentage" label="Blend Percentage" min={0} max={1} step={0.001} />

                <InspectorSection title="Debug">
                    <InspectorBoolean object={cascadedShadowGenerator} property="debug" label="Debug" />
                </InspectorSection>
            </InspectorSection>
        );
    }

    /**
     * Returns the inspector used to excluded meshes from light computation.
     */
    protected getIncludedMeshesInspector(): React.ReactNode {
        const shadowMap = this.shadowGenerator?.getShadowMap();
        if (!shadowMap?.renderList) { return undefined; }

        return (
            <InspectorSection title="Included Meshes">
                <MeshTransferComponent editor={this.editor} targetArray={shadowMap.renderList} />
            </InspectorSection>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: ShadowsInspector,
    ctorNames: ["DirectionalLight", "SpotLight", "PointLight"],
    title: "Shadows",
});

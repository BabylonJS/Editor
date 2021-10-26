import { join, extname } from "path";

import * as React from "react";

import { Texture, CubeTexture } from "babylonjs";

import { InspectorList } from "../../../gui/inspector/fields/list";
import { InspectorButton } from "../../../gui/inspector/fields/button";
import { InspectorNumber } from "../../../gui/inspector/fields/number";
import { InspectorString } from "../../../gui/inspector/fields/string";
import { InspectorSection } from "../../../gui/inspector/fields/section";
import { InspectorBoolean } from "../../../gui/inspector/fields/boolean";

import { Project } from "../../../project/project";

import { AbstractInspector } from "../abstract-inspector";
import { Inspector, IObjectInspectorProps } from "../../inspector";

export interface ITextureInspectorState {
    /**
     * Defines the current sampling mode of the texture.
     */
    samplingMode?: number;
}

export class TextureInspector<T extends Texture | CubeTexture, S extends ITextureInspectorState> extends AbstractInspector<T, S> {
    private static _CoordinatesModes: string[] = [
        "EXPLICIT_MODE", "SPHERICAL_MODE", "PLANAR_MODE", "CUBIC_MODE",
        "PROJECTION_MODE", "SKYBOX_MODE", "INVCUBIC_MODE", "EQUIRECTANGULAR_MODE",
        "FIXED_EQUIRECTANGULAR_MODE", "FIXED_EQUIRECTANGULAR_MIRRORED_MODE",
    ];

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.state = {
            ...this.state,
            samplingMode: this.selectedObject instanceof Texture ? this.selectedObject.samplingMode : undefined,
        };
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        if (!this.selectedObject.metadata?.editorName) {
            this.selectedObject.metadata ??= {};
            this.selectedObject.metadata.editorName ??= "";
        }

        return (
            <>
                {this.getPreviewInspector()}
                {this.getCommonInspector()}

                {this.getScaleInspector()}
                {this.getOffsetInspector()}
                {this.getCubeTextureInspector()}
            </>
        );
    }

    /**
     * Returns the preview inspector that draws the texture preview.
     */
    protected getPreviewInspector(): React.ReactNode {
        if (!Project.DirPath) {
            return undefined;
        }

        let path = this.selectedObject.isCube ? "../css/svg/dds.svg" : join(this.editor.assetsBrowser.assetsDirectory, this.selectedObject.name) ?? "";
        const extension = extname(this.selectedObject.name).toLowerCase();
        switch (extension) {
            case ".basis": path = "../css/images/ktx.png"; break;
            default: break;
        }

        return (
            <InspectorSection title="Preview">
                <a style={{ color: "white", textAlign: "center", wordBreak: "break-all" }} onClick={() => this.editor.assetsBrowser.revealPanelAndShowFile(this.selectedObject.name)}>{this.selectedObject.name}</a>
                <img src={path} style={{ width: "100%", height: "280px", objectFit: "contain" }}></img>
                <InspectorButton label="Show In Assets Browser" small icon="link" onClick={() => this.editor.assetsBrowser.revealPanelAndShowFile(this.selectedObject.name)} />
            </InspectorSection>
        );
    }

    /**
     * Returns the inspector used to edit the common properties of
     * the texture.
     */
    protected getCommonInspector(): React.ReactNode {
        return (
            <InspectorSection title="Common">
                <InspectorString object={this.selectedObject.metadata} property="editorName" label="Name" />
                <InspectorBoolean object={this.selectedObject} property="hasAlpha" label="Has Alpha" />
                <InspectorBoolean object={this.selectedObject} property="getAlphaFromRGB" label="Alpha From RGB" />
                <InspectorBoolean object={this.selectedObject} property="gammaSpace" label="Gamme Space" />
                <InspectorBoolean object={this.selectedObject} property="invertZ" label="Invert Z" />
                <InspectorNumber object={this.selectedObject} property="coordinatesIndex" label="Coordinates Index" min={0} step={1} />
                <InspectorNumber object={this.selectedObject} property="level" label="Level" min={0} step={0.01} />

                {this.getSamplingModeInspector()}

                <InspectorList object={this.selectedObject} property="coordinatesMode" label="Coordinates Mode" items={
                    TextureInspector._CoordinatesModes.map((cm) => ({ label: cm, data: Texture[cm] }))
                } />
            </InspectorSection>
        );
    }

    /**
     * Returns the inspector used to configure the sampling mode.
     */
    protected getSamplingModeInspector(): React.ReactNode {
        if (!(this.selectedObject instanceof Texture)) {
            return undefined;
        }

        return (
            <InspectorList object={this.state} property="samplingMode" label="Sampling Mode" items={[
                { label: "NEAREST_SAMPLINGMODE", data: Texture.NEAREST_SAMPLINGMODE },
                { label: "BILINEAR_SAMPLINGMODE", data: Texture.BILINEAR_SAMPLINGMODE },
                { label: "TRILINEAR_SAMPLINGMODE", data: Texture.TRILINEAR_SAMPLINGMODE },
            ]} onChange={(v: number) => {
                this.selectedObject.updateSamplingMode(v);
            }} />
        );
    }

    /**
     * Returns the inspector used to configure the scale (UV) of the texture.
     */
    protected getScaleInspector(): React.ReactNode {
        if (!(this.selectedObject instanceof Texture)) {
            return undefined;
        }

        return (
            <InspectorSection title="Scale">
                <InspectorNumber object={this.selectedObject} property="uScale" label="U Scale" step={0.01} />
                <InspectorNumber object={this.selectedObject} property="vScale" label="V Scale" step={0.01} />
            </InspectorSection>
        );
    }

    /**
     * Returns the inspector used to configure the offset (UV) of the texture.
     */
    protected getOffsetInspector(): React.ReactNode {
        if (!(this.selectedObject instanceof Texture)) {
            return undefined;
        }

        return (
            <InspectorSection title="Offset">
                <InspectorNumber object={this.selectedObject} property="uOffset" label="U Offset" step={0.01} />
                <InspectorNumber object={this.selectedObject} property="vOffset" label="V Offset" step={0.01} />
            </InspectorSection>
        );
    }

    /**
     * Returns the inspector used to configure the cube texture properties.
     */
    protected getCubeTextureInspector(): React.ReactNode {
        if (!(this.selectedObject instanceof CubeTexture)) {
            return undefined;
        }

        return (
            <InspectorSection title="Cube Texture">
                <InspectorNumber object={this.selectedObject} property="rotationY" label="Rotation Y" step={0.01} />
            </InspectorSection>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: TextureInspector,
    ctorNames: ["Texture", "CubeTexture"],
    title: "Texture",
});

import { pathExists } from "fs-extra";
import { join, extname, isAbsolute, dirname, basename } from "path";

import { Nullable } from "../../../../../shared/types";

import * as React from "react";

import { FireProceduralTexture } from "babylonjs-procedural-textures";
import { Texture, CubeTexture, ColorGradingTexture, ProceduralTexture } from "babylonjs";

import { InspectorList } from "../../../gui/inspector/fields/list";
import { InspectorButton } from "../../../gui/inspector/fields/button";
import { InspectorNumber } from "../../../gui/inspector/fields/number";
import { InspectorString } from "../../../gui/inspector/fields/string";
import { InspectorSection } from "../../../gui/inspector/fields/section";
import { InspectorBoolean } from "../../../gui/inspector/fields/boolean";
import { InspectorVector2 } from "../../../gui/inspector/fields/vector2";
import { InspectorColorPicker } from "../../../gui/inspector/fields/color-picker";

import { Project } from "../../../project/project";
import { WorkSpace } from "../../../project/workspace";

import { KTXTools } from "../../../tools/ktx";

import { AbstractInspector } from "../abstract-inspector";
import { Inspector, IObjectInspectorProps } from "../../inspector";

import { TextureFileInspectorComponent, TextureFileInspectorObject } from "./texture-file-inspector";

export interface ITextureInspectorState {
    /**
     * Defines the current sampling mode of the texture.
     */
    samplingMode?: number;
    /**
     * Defines the reference to the optional texture file object used to edit the texture's file configuration.
     */
    textureFileObject?: TextureFileInspectorObject;
}

export class TextureInspector<T extends Texture | CubeTexture | ColorGradingTexture, S extends ITextureInspectorState> extends AbstractInspector<T, S> {
    private static _CoordinatesModes: string[] = [
        "EXPLICIT_MODE", "SPHERICAL_MODE", "PLANAR_MODE", "CUBIC_MODE",
        "PROJECTION_MODE", "SKYBOX_MODE", "INVCUBIC_MODE", "EQUIRECTANGULAR_MODE",
        "FIXED_EQUIRECTANGULAR_MODE", "FIXED_EQUIRECTANGULAR_MIRRORED_MODE",
    ];

    private _previewImgRef: Nullable<HTMLImageElement> = null;

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

                {this.getProceduralTextureInspector()}

                {this.getTextureFileComponent()}
            </>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        super.componentDidMount();
        this._checkTextureFile();
    }

    private async _checkTextureFile(): Promise<void> {
        if (!(this.selectedObject instanceof Texture) || !this.selectedObject.url) {
            return;
        }

        let textureUrl = this.selectedObject.url;
        if (!isAbsolute(textureUrl)) {
            textureUrl = join(WorkSpace.DirPath!, "assets", textureUrl);
        }

        if (!await pathExists(textureUrl)) {
            return;
        }

        const relativeUrl = textureUrl.replace(join(WorkSpace.DirPath!, "assets/"), "");
        this.setState({ textureFileObject: new TextureFileInspectorObject(relativeUrl) });
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
            case ".3dl": path = "../css/svg/magic.svg"; break;
            case ".basis": path = "../css/images/ktx.png"; break;
            default: break;
        }

        if (this.selectedObject.loadingError) {
            path = "../css/svg/question-mark.svg";
        }

        const size = this.selectedObject.getSize();
        const baseSize = this.selectedObject.getBaseSize();

        return (
            <InspectorSection title="Preview">
                <a style={{ color: "white", textAlign: "center", wordBreak: "break-all" }} onClick={() => this.editor.assetsBrowser.revealPanelAndShowFile(this.selectedObject.name)}>{this.selectedObject.name}</a>
                {this.getImagePreview(path)}
                <InspectorButton label="Show In Assets Browser" small icon="link" onClick={() => this.editor.assetsBrowser.revealPanelAndShowFile(this.selectedObject.name)} />
                <div style={{ color: "darkgrey" }}>
                    <span style={{ display: "block" }}>Size: {size.width}*{size.height}</span>
                    <span style={{ display: "block" }}>Base Size: {baseSize.width}*{baseSize.height}</span>
                </div>
                {this.getReloadTextureButton()}
            </InspectorSection>
        );
    }

    protected getImagePreview(path: string): React.ReactNode {
        if (this.selectedObject instanceof ProceduralTexture) {
            return null;
        }

        return (
            <img
                ref={(r) => this._previewImgRef = r}
                src={`${path}?dummy=${Date.now()}`}
                style={{ width: "100%", height: "280px", objectFit: "contain" }}
            >

            </img>
        );
    }

    /**
     * Returns the button used to reload the texture from file.
     */
    protected getReloadTextureButton(): React.ReactNode {
        if (!(this.selectedObject instanceof Texture) || this.selectedObject instanceof ProceduralTexture) {
            return undefined;
        }

        return (
            <InspectorButton label="Reload" small onClick={() => this._reloadTexture(true)} />
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

                {this.getWrappingSection()}
                {this.getSamplingModeInspector()}

                <InspectorList object={this.selectedObject} property="coordinatesMode" label="Coordinates Mode" items={
                    TextureInspector._CoordinatesModes.map((cm) => ({ label: cm, data: Texture[cm] }))
                } />
            </InspectorSection>
        );
    }

    /**
     * Returns the section used to edit the wrapping properties of the selected texture.
     */
    protected getWrappingSection(): React.ReactNode {
        if (!(this.selectedObject instanceof Texture)) {
            return undefined;
        }

        return (
            <InspectorSection title="Wrapping">
                {this.getWrappingInspector("wrapU", "Wrap U")}
                {this.getWrappingInspector("wrapV", "Wrap V")}
                {this.getWrappingInspector("wrapR", "Wrap R")}
            </InspectorSection>
        );
    }

    /**
     * Returns the inspector used to configure the given wrapping property.
     */
    protected getWrappingInspector(property: string, label: string): React.ReactNode {
        if (!(this.selectedObject instanceof Texture)) {
            return undefined;
        }

        return (
            <InspectorList object={this.selectedObject} property={property} label={label} items={[
                { label: "Wrap", data: Texture.WRAP_ADDRESSMODE },
                { label: "Clamp", data: Texture.CLAMP_ADDRESSMODE },
                { label: "Mirror", data: Texture.MIRROR_ADDRESSMODE },
            ]} />
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
                <InspectorBoolean object={this.selectedObject} property="_invertY" label="Invert Y" onChange={() => this._reloadTexture(false)} />
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

    /**
     * Returns the inspector used to configure the texture's file configuration.
     */
    protected getTextureFileComponent(): React.ReactNode {
        if (!this.state.textureFileObject) {
            return undefined;
        }

        return (
            <TextureFileInspectorComponent object={this.state.textureFileObject} onCompressionChanged={() => {
                if (WorkSpace.Workspace?.ktx2CompressedTextures?.enabledInPreview) {
                    this._reloadTexture(true);
                }
            }} />
        );
    }

    /**
     * Returns the inspector used to configure the procedural texture.
     */
    protected getProceduralTextureInspector(): React.ReactNode {
        if (!(this.selectedObject instanceof ProceduralTexture)) {
            return null;
        }

        const resizeData = {
            value: this.selectedObject.getSize().width,
        };

        const resize = (
            <InspectorList object={resizeData} property="value" label="Size" items={[
                { label: "4", data: 4 },
                { label: "8", data: 8 },
                { label: "16", data: 16 },
                { label: "32", data: 32 },
                { label: "64", data: 64 },
                { label: "128", data: 128 },
                { label: "256", data: 256 },
                { label: "512", data: 512 },
                { label: "1024", data: 1024 },
                { label: "2048", data: 2048 },
                { label: "4096", data: 4096 },
            ]} onChange={(s) => {
                (this.selectedObject as ProceduralTexture).resize({ width: s, height: s }, true);
            }} />
        );

        if (this.selectedObject instanceof FireProceduralTexture) {
            const colors = {
                color1: this.selectedObject.fireColors[0],
                color2: this.selectedObject.fireColors[1],
                color3: this.selectedObject.fireColors[2],
                color4: this.selectedObject.fireColors[3],
                color5: this.selectedObject.fireColors[4],
                color6: this.selectedObject.fireColors[5],
            };

            return (
                <InspectorSection title="Fire Procedural Texture">
                    {resize}
                    <InspectorVector2 object={this.selectedObject} property="speed" label="Speed" />
                    <InspectorNumber object={this.selectedObject} property="alphaThreshold" label="Alpha Threshold" />

                    <InspectorColorPicker object={colors} property="color1" label="Color 1" />
                    <InspectorColorPicker object={colors} property="color2" label="Color 2" />
                    <InspectorColorPicker object={colors} property="color3" label="Color 3" />
                    <InspectorColorPicker object={colors} property="color4" label="Color 4" />
                    <InspectorColorPicker object={colors} property="color5" label="Color 5" />
                    <InspectorColorPicker object={colors} property="color6" label="Color 6" />
                </InspectorSection>
            );
        }
    }

    /**
     * Reloads the texture in case the user taps the "Reload" button.
     * Takes care of the compressed version of the texture.
     */
    private async _reloadTexture(recompress: boolean): Promise<void> {
        if (!(this.selectedObject instanceof Texture)) {
            return undefined;
        }

        // Update preview img
        if (this._previewImgRef) {
            this._previewImgRef.src = "";

            const path = join(this.editor.assetsBrowser.assetsDirectory, this.selectedObject.name);
            if (await pathExists(path)) {
                this._previewImgRef.src = join(this.editor.assetsBrowser.assetsDirectory, this.selectedObject.name) + `?dummy=${Date.now()}`;
            } else {
                this._previewImgRef.src = "../css/svg/question-mark.svg";
            }
        }

        this.editor.assetsBrowser._files?.refresh();

        const extension = extname(this.selectedObject.name).toLowerCase();
        const ktxSupported = KTXTools.SupportedExtensions.indexOf(extension) !== -1;

        const textureUrl = this.selectedObject.url;
        const ktxFormat = KTXTools.GetSupportedKtxFormat(this.editor.engine!);
        const ktx2CompressedTextures = WorkSpace.Workspace?.ktx2CompressedTextures;
        const compressedTexturesDest = join(this.editor.assetsBrowser.assetsDirectory, dirname(this.selectedObject.name));

        if (recompress && ktxSupported && ktxFormat && ktx2CompressedTextures?.enabled && ktx2CompressedTextures.enabledInPreview) {
            if (!(await pathExists(compressedTexturesDest))) {
                return;
            }

            const absoluteTexturePath = join(this.editor.assetsBrowser.assetsDirectory, this.selectedObject.name);

            try {
                await KTXTools.CompressTexture(this.editor, absoluteTexturePath, compressedTexturesDest, ktxFormat);

                const relativeKtxTexturePath = KTXTools.GetKtxFileName(this.selectedObject.name, ktxFormat);
                const absoluteKtxTexturePath = join(compressedTexturesDest, basename(relativeKtxTexturePath));

                try {
                    this.selectedObject.updateURL(absoluteKtxTexturePath);
                } catch (e) {
                    // Catch silently.
                }

                this.selectedObject.url = textureUrl;
            } catch (e) {
                // Catch silently.
            }
        } else {
            if (textureUrl) {
                if (!isAbsolute(textureUrl)) {
                    this.selectedObject.url = join(WorkSpace.DirPath!, "assets", textureUrl);
                }

                try {
                    if (ktxSupported && ktxFormat && ktx2CompressedTextures?.enabled && ktx2CompressedTextures.enabledInPreview) {
                        if (!(await pathExists(compressedTexturesDest))) {
                            await KTXTools.CompressTexture(this.editor, this.selectedObject.url!, compressedTexturesDest, ktxFormat);
                        }

                        const relativeKtxTexturePath = KTXTools.GetKtxFileName(this.selectedObject.name, ktxFormat);
                        const absoluteKtxTexturePath = join(compressedTexturesDest, basename(relativeKtxTexturePath));

                        this.selectedObject.updateURL(absoluteKtxTexturePath);
                    } else {
                        this.selectedObject.updateURL(this.selectedObject.url!);
                    }
                } catch (e) {
                    // Catch silently.
                }

                this.selectedObject.url = textureUrl;
            }
        }
    }
}

Inspector.RegisterObjectInspector({
    ctor: TextureInspector,
    ctorNames: [
        "Texture", "CubeTexture", "ColorGradingTexture",
        "FireProceduralTexture",
    ],
    title: "Texture",
});

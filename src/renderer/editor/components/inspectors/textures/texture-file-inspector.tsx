import * as React from "react";

import { InspectorSection } from "../../../gui/inspector/fields/section";

import { AssetsBrowserItemHandler } from "../../assets-browser/files/item-handler";

import { AbstractInspector } from "../abstract-inspector";
import { Inspector, IObjectInspectorProps } from "../../inspector";
import { InspectorList } from "../../../gui/inspector/fields/list";
import { WorkSpace } from "../../../project/workspace";
import { IAssetFileConfiguration } from "../../../project/typings";

export class TextureFileInspectorObject {
    public constructor(
        public relativePath: string,
    ) {
        // Empty.
    }
}

export interface ITextureFileInspectorState {
    // ...
}

export class TextureFileInspector extends AbstractInspector<TextureFileInspectorObject, ITextureFileInspectorState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.state = {};
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <TextureFileInspectorComponent object={this.selectedObject} />
        );
    }
}

export interface ITextureFileInspectorComponentProps {
    /**
     * Defines the reference to the asset file configuration object.
     */
    object: TextureFileInspectorObject;
}

export class TextureFileInspectorComponent extends React.Component<ITextureFileInspectorComponentProps, ITextureFileInspectorState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: ITextureFileInspectorComponentProps) {
        super(props);
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        if (!this.props.object) {
            return null;
        }

        AssetsBrowserItemHandler.AssetsConfiguration[this.props.object.relativePath] ??= {};

        const configuration = AssetsBrowserItemHandler.AssetsConfiguration[this.props.object.relativePath];

        return (
            <InspectorSection title="Asset File Configuration">
                {this._getCompressionInspector(configuration)}
            </InspectorSection>
        );
    }

    /**
     * Returns the inspector used to edit the compression options of the texture file.
     */
    private _getCompressionInspector(configuration: IAssetFileConfiguration): React.ReactNode {
        if (!WorkSpace.Workspace?.ktx2CompressedTextures?.pvrTexToolCliPath) {
            return undefined;
        }

        configuration.ktxCompression ??= {};
        configuration.ktxCompression.astc ??= {
            quality: "automatic",
        };
        configuration.ktxCompression.dxt ??= {
            type: "automatic",
        };
        configuration.ktxCompression.pvrtc ??= {
            quality: "automatic",
        };
        configuration.ktxCompression.etc1 ??= {
            quality: "automatic",
        };
        configuration.ktxCompression.etc2 ??= {
            quality: "automatic",
        };

        return (
            <InspectorSection title="Compression">
                <InspectorSection title="ASTC">
                    <InspectorList object={configuration.ktxCompression.astc} property="quality" label="Quality" items={[
                        { label: "None", data: "none" },
                        { label: "Automatic", data: "automatic" },
                        { label: "astcveryfast", data: "astcveryfast" },
                        { label: "astcfast", data: "astcfast" },
                        { label: "astcmedium", data: "astcmedium" },
                        { label: "astcthorough", data: "astcthorough" },
                        { label: "astcexhaustive", data: "astcexhaustive" },
                    ]} onChange={(r) => {
                        configuration.ktxCompression!.astc!.quality = r as any;
                    }} />
                </InspectorSection>

                <InspectorSection title="DXT">
                    <InspectorList object={configuration.ktxCompression.dxt} property="type" label="Type" items={[
                        { label: "None", data: "none" },
                        { label: "Automatic", data: "automatic" },
                        { label: "BC1", data: "BC1" },
                        { label: "BC2", data: "BC2" },
                        { label: "BC3", data: "BC3" },
                        { label: "BC4", data: "BC4" },
                        { label: "BC5", data: "BC5" },
                    ]} onChange={(r) => {
                        configuration.ktxCompression!.dxt!.type = r as any;
                    }} />
                </InspectorSection>

                <InspectorSection title="PVRTC">
                    <InspectorList object={configuration.ktxCompression.pvrtc} property="quality" label="Quality" items={[
                        { label: "None", data: "none" },
                        { label: "Automatic", data: "automatic" },
                        { label: "pvrtcfastest", data: "pvrtcfastest" },
                        { label: "pvrtcfast", data: "pvrtcfast" },
                        { label: "pvrtclow", data: "pvrtclow" },
                        { label: "pvrtcnormal", data: "pvrtcnormal" },
                        { label: "pvrtchigh", data: "pvrtchigh" },
                        { label: "pvrtcveryhigh", data: "pvrtcveryhigh" },
                        { label: "pvrtcthorough", data: "pvrtcthorough" },
                        { label: "pvrtcbest", data: "pvrtcbest" },
                    ]} onChange={(r) => {
                        configuration.ktxCompression!.pvrtc!.quality = r as any;
                    }} />
                </InspectorSection>

                <InspectorSection title="ETC1">
                    <InspectorList object={configuration.ktxCompression.etc1} property="quality" label="Quality" items={[
                        { label: "None", data: "none" },
                        { label: "Automatic", data: "automatic" },
                        { label: "etcfast", data: "etcfast" },
                        { label: "etcnormal", data: "etcnormal" },
                        { label: "etcslow", data: "etcslow" },
                    ]} onChange={(r) => {
                        configuration.ktxCompression!.etc1!.quality = r as any;
                    }} />
                </InspectorSection>

                <InspectorSection title="ETC2">
                    <InspectorList object={configuration.ktxCompression.etc2} property="quality" label="Quality" items={[
                        { label: "None", data: "none" },
                        { label: "Automatic", data: "automatic" },
                        { label: "etcfast", data: "etcfast" },
                        { label: "etcnormal", data: "etcnormal" },
                        { label: "etcslow", data: "etcslow" },
                    ]} onChange={(r) => {
                        configuration.ktxCompression!.etc2!.quality = r as any;
                    }} />
                </InspectorSection>
            </InspectorSection>
        );
    }
}

Inspector.RegisterObjectInspector({
    title: "Asset",
    ctor: TextureFileInspector,
    ctorNames: ["TextureFileInspectorObject"],
});

import { extname } from "path";

import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { GroundMesh, VertexData, Texture, Color3 } from "babylonjs";

import { Inspector, IObjectInspectorProps } from "../../components/inspector";

import { Alert } from "../../gui/alert";

import { InspectorColor } from "../../gui/inspector/fields/color";
import { InspectorNumber } from "../../gui/inspector/fields/number";
import { InspectorButton } from "../../gui/inspector/fields/button";
import { InspectorSection } from "../../gui/inspector/fields/section";

import { Tools } from "../../tools/tools";
import { undoRedo } from "../../tools/undo-redo";
import { IGroundMetadata } from "../../tools/types";

import { AbstractInspector } from "../abstract-inspector";
import { InspectorColorPicker } from "../../gui/inspector/fields/color-picker";

export interface IGroundInspectorState {
    /**
     * Defines wether or not the ground is having a height map.
     */
    hasHeightMap: boolean;
}

export class GroundInspector extends AbstractInspector<GroundMesh, IGroundInspectorState> {
    private _colorFilter: Nullable<Color3> = null;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.state = {
            hasHeightMap: (this.selectedObject.metadata?.heightMap ?? null) !== null,
        };
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                <InspectorSection title="Ground">
                    <InspectorNumber object={this.selectedObject} property="_width" label="Width" min={0} step={0.01} onChange={() => this._applyGeometry()} />
                    <InspectorNumber object={this.selectedObject} property="_height" label="Height" min={0} step={0.01} onChange={() => this._applyGeometry()} />
                    <InspectorNumber object={this.selectedObject} property="_subdivisionsX" label="Sub Divisions X" min={0} step={1} onChange={() => this._applyGeometry()} />
                    <InspectorNumber object={this.selectedObject} property="_subdivisionsY" label="Sub Divisions Y" min={0} step={1} onChange={() => this._applyGeometry()} />
                </InspectorSection>

                {this.getHeightMapInspector()}
            </>
        );
    }

    /**
     * Returns the inspector used to configure the height map properties of the ground mesh.
     */
    protected getHeightMapInspector(): React.ReactNode {
        if (!this.state.hasHeightMap) {
            return (
                <InspectorSection title="Height Map">
                    <h2 style={{ textAlign: "center", color: "white" }}>No Height Map properties set.</h2>
                    <InspectorButton label="Load Height Map..." onClick={() => this._handleLoadHeightMap()} />
                </InspectorSection>
            );
        }

        const metadata = this._getGroundMetadata();
        if (!metadata.heightMap?.options) {
            return undefined;
        }

        this._colorFilter = Color3.FromArray(metadata.heightMap.options.colorFilter);

        return (
            <InspectorSection title="Height Map">
                <InspectorNumber object={metadata.heightMap.options} property="minHeight" label="Min Height" step={0.01} onChange={() => this._applyHeightMapGeometry()} />
                <InspectorNumber object={metadata.heightMap.options} property="maxHeight" label="Max Height" step={0.01} onChange={() => this._applyHeightMapGeometry()} />

                <InspectorColor object={this} property="_colorFilter" label="Color Filter" step={0.01} onChange={() => this._handleColorFilterChanged()} />
                <InspectorColorPicker object={this} property="_colorFilter" label="Color Filter" onChange={() => this._handleColorFilterChanged()} />

                <InspectorButton label="Remove Height Map" onClick={() => this._handleRemoveHeightMap()} />
            </InspectorSection>
        );
    }

    /**
     * Called on the color filter changed.
     */
    private _handleColorFilterChanged(): void {
        if (!this._colorFilter) { return; }

        const metadata = this._getGroundMetadata();
        if (!metadata.heightMap?.options) {
            return undefined;
        }

        metadata.heightMap.options.colorFilter = [this._colorFilter.r, this._colorFilter.g, this._colorFilter.b];
        this._applyHeightMapGeometry();
    }

    /**
     * Loads the height map and applies the new geometry.
     */
    private async _handleLoadHeightMap(): Promise<void> {
        const file = await Tools.ShowOpenFileDialog("Select Height Map Texture");
        const extensions = [".png", ".jpg", ".jpeg", ".bmp"];

        if (extensions.indexOf(extname(file).toLocaleLowerCase()) === -1) {
            return Alert.Show("Can't Setup From Height Map", `Only [${extensions.join(", ")}] extensions are supported.`);
        }

        const texture = await new Promise<Nullable<Texture>>((resolve) => {
            const texture = new Texture(file, this.editor.engine!, false, false, Texture.TRILINEAR_SAMPLINGMODE, () => resolve(texture), () => resolve(null))
        });
        if (!texture) { return; }

        const pixels = texture.readPixels();
        if (!pixels) { return; }

        // Save metadata
        const metadata = this._getGroundMetadata();
        metadata.heightMap ??= { };
        metadata.heightMap.texture = Array.from(new Uint8Array(pixels.buffer));
        metadata.heightMap.textureWidth = texture.getSize().width;
        metadata.heightMap.textureHeight = texture.getSize().height;
        metadata.heightMap.options = metadata.heightMap.options ?? {
            minHeight: 0,
            maxHeight: 50,
            colorFilter: [0.3, 0.59, 0.11],
        };

        this._applyHeightMapGeometry();
        this.setState({ hasHeightMap: true });
    }

    /**
     * Called on the user wants to remove the height map properties for the ground.
     */
    private _handleRemoveHeightMap(): void {
        const metadata = this._getGroundMetadata().heightMap;

        undoRedo.push({
            common: () => this.forceUpdate(),
            undo: () => {
                this.selectedObject.metadata.heightMap = metadata;
                this._applyGeometry();
                this.isMounted && this.setState({ hasHeightMap: true });
            },
            redo: () => {
                delete this.selectedObject.metadata.heightMap;
                this._applyGeometry();
                this.isMounted && this.setState({ hasHeightMap: false });
            },
        });
    }

    /**
     * Returns the ground metadata.
     */
    private _getGroundMetadata(): IGroundMetadata {
        this.selectedObject.metadata = this.selectedObject.metadata ?? {};

        return this.selectedObject.metadata;
    }

    /**
     * Called on the ground geometry should be updated.
     */
    private _applyGeometry(): void {
        const metadata = this._getGroundMetadata();
        if (metadata.heightMap) {
            this._applyHeightMapGeometry();
        } else {
            this._applyNormalGeometry();
        }
    }

    /**
     * Called on the ground geometry should be updated.
     */
    private _applyNormalGeometry(): void {
        this.selectedObject.geometry?.setAllVerticesData(VertexData.CreateGround({
            width: this.selectedObject._width,
            height: this.selectedObject._height,
            subdivisionsX: this.selectedObject.subdivisionsX,
            subdivisionsY: this.selectedObject.subdivisionsY,
        }), true);
    }

    /**
     * Called on the ground geometry with height map shoudl be updated.
     */
    private _applyHeightMapGeometry(): void {
        const heightMapMetadata = this._getGroundMetadata().heightMap;
        if (!heightMapMetadata?.options) { return; }

        this.selectedObject.geometry?.setAllVerticesData(VertexData.CreateGroundFromHeightMap({
            width: this.selectedObject._width,
            height: this.selectedObject._height,
            subdivisions: this.selectedObject.subdivisions,
            minHeight: heightMapMetadata.options.minHeight,
            maxHeight: heightMapMetadata.options.maxHeight,
            colorFilter: Color3.FromArray(heightMapMetadata.options.colorFilter),
            buffer: Uint8Array.from(heightMapMetadata.texture!),
            bufferWidth: heightMapMetadata.textureWidth!,
            bufferHeight: heightMapMetadata.textureHeight!,
            alphaFilter: 0
        }), true);
    }
}

Inspector.RegisterObjectInspector({
    ctor: GroundInspector,
    ctorNames: ["GroundMesh"],
    title: "Ground Mesh",
});

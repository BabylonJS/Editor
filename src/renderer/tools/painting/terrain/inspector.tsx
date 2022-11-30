import { basename } from "path";

import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { ContextMenu, Divider, H4, Menu, MenuItem } from "@blueprintjs/core";

import { Icon } from "../../../editor/gui/icon";

import { InspectorNumber } from "../../../editor/gui/inspector/fields/number";
import { InspectorSection } from "../../../editor/gui/inspector/fields/section";

import { IObjectInspectorProps } from "../../../editor/components/inspector";
import { AbstractInspector } from "../../../editor/components/inspectors/abstract-inspector";

import { TerrainSculptPainter } from "../../../editor/painting/terrain/sculpt";

export interface ITerrainPainterInspectorState {
    brushImage: Nullable<string>;
}

export class TerrainPainterInspector extends AbstractInspector<TerrainSculptPainter, ITerrainPainterInspectorState> {
    private static _serializedConfiguration: Nullable<any> = null;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.selectedObject = new TerrainSculptPainter(this.editor);
        if (TerrainPainterInspector._serializedConfiguration) {
            this.selectedObject.parse(TerrainPainterInspector._serializedConfiguration);
        }

        this.state = {
            brushImage: this.selectedObject.brushAbsolutePath,
        };
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                <Divider />
                <H4 style={{ textAlign: "center", margin: "10px 0px 10px 0px" }}>Terrain Painter</H4>
                <InspectorSection title="Tool">
                    <InspectorNumber object={this.selectedObject} property="size" label="Size" min={0} step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="strength" label="Strength" min={0} step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="attenuation" label="attenuation" min={0} max={1} step={0.01} />
                </InspectorSection>
                <InspectorSection title="Brush">
                    <div style={{ width: "100%", height: "140px" }}>
                        <div data-tooltip={this.state.brushImage ? undefined : "No Material Set."} style={{ height: "100px", margin: "auto" }}>
                            <img
                                src={this.state.brushImage ?? "../css/svg/question-mark.svg"}
                                style={{ border: "dashed black 1px", objectFit: "contain", width: "100%", height: "100%" }}
                                onDragEnter={(e) => (e.currentTarget as HTMLImageElement).style.border = "dashed red 1px"}
                                onDragLeave={(e) => (e.currentTarget as HTMLImageElement).style.border = "dashed black 1px"}
                                onDrop={(e) => this._handleBrushDropped(e)}
                                onContextMenu={(e) => this._handleBrushContextMenu(e)}
                            ></img>
                        </div>
                        <H4 style={{ lineHeight: "50px", textAlign: "center" }}>{this.state.brushImage ? basename(this.state.brushImage) : "None Selected"}</H4>
                    </div>
                </InspectorSection>
            </>
        );
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        super.componentWillUnmount();

        TerrainPainterInspector._serializedConfiguration = this.selectedObject.serialize();
        this.selectedObject?.dispose();
    }

    /**
     * Called on the user drops an element on the brush.
     */
    private _handleBrushDropped(event: React.DragEvent<HTMLImageElement>): void {
        (event.currentTarget as HTMLImageElement).style.border = "dashed black 1px";

        try {
            const dataContent = event.dataTransfer.getData("asset/texture");
            const data = JSON.parse(dataContent);

            if (!data) {
                return;
            }

            this.setState({ brushImage: data.absolutePath });

            const img = new Image();
            img.src = data.absolutePath;
            img.addEventListener("load", () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;

                const context = canvas.getContext("2d");

                context?.scale(512 / img.width, 512 / img.height);
                context?.drawImage(img, 0, 0);

                const pixels = context?.getImageData(0, 0, img.width, img.height);
                if (pixels) {
                    this.selectedObject.brushData = pixels;
                    this.selectedObject.brushAbsolutePath = data.absolutePath;
                }
            });
        } catch (e) {
            /* Catch silently */
        }
    }

    /**
     * Called on the user right-clicks the brush preview.
     */
    private _handleBrushContextMenu(event: React.MouseEvent<HTMLImageElement, MouseEvent>): void {
        if (!this.state.brushImage) {
            return;
        }

        ContextMenu.show((
            <Menu>
                <MenuItem text="Remove" icon={<Icon src="cross.svg" />} onClick={() => {
                    this.setState({ brushImage: null });
                    this.selectedObject.brushData = null;
                }}/>
            </Menu>
        ), {
            top: event.clientY,
            left: event.clientX,
        })
    }
}

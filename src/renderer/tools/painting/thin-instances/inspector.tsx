import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { H4 } from "@blueprintjs/core";

import { Mesh } from "babylonjs";

import { InspectorNumber } from "../../../editor/gui/inspector/fields/number";
import { InspectorSection } from "../../../editor/gui/inspector/fields/section";
import { InspectorVector3 } from "../../../editor/gui/inspector/fields/vector3";
import { InspectorBoolean } from "../../../editor/gui/inspector/fields/boolean";

import { MaterialAssets } from "../../../editor/assets/materials";

import { ThinInstancePainter } from "../../../editor/painting/thin-instance/thin-instance";

import { IObjectInspectorProps } from "../../../editor/components/inspector";
import { AbstractInspector } from "../../../editor/inspectors/abstract-inspector";

export interface IThinInstancePainterState {
    /**
     * Defines the reference to the current mesh being duplicated using
     * thin instances.
     */
    selectedMesh: Nullable<Mesh>;
}

export class ThinInstancePainterInspector extends AbstractInspector<ThinInstancePainter, IThinInstancePainterState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.selectedObject = new ThinInstancePainter(this.editor);

        this.state = {
            selectedMesh: null,
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <>
                <H4 style={{ textAlign: "center" }}>Thin Instances Painter</H4>
                {super.render()}
            </>
        );
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        const meshMaterial = this.state.selectedMesh?.material ?? this.editor.scene!.defaultMaterial;
        const materialAsset = this.editor.assets.getComponent(MaterialAssets)?.getAssetFromMaterial(meshMaterial);

        return (
            <>
                <InspectorSection title="Material">
                    <div style={{ width: "100%", height: "100px" }}>
                        <div style={{ width: "35%", height: "100px", float: "left" }}>
                            <img
                                src={this.state.selectedMesh && materialAsset ? materialAsset.base64 : "../css/svg/plus.svg"}
                                style={{ border: "dashed black 1px", objectFit: "contain", width: "100%", height: "100%" }}
                                onDragEnter={(e) => (e.currentTarget as HTMLImageElement).style.border = "dashed red 1px"}
                                onDragLeave={(e) => (e.currentTarget as HTMLImageElement).style.border = "dashed black 1px"}
                                onDrop={(e) => this._handleNodeDropped(e)}
                            ></img>
                        </div>
                        <div style={{ width: "65%", height: "100px", float: "left" }}>
                            <H4 style={{ lineHeight: "100px", textAlign: "center" }}>{this.state.selectedMesh?.name ?? "None Selected"}</H4>
                        </div>
                    </div>
                </InspectorSection>

                <InspectorSection title="Transforms">
                    <InspectorVector3 object={this.selectedObject} property="randomRotationMin" label="Random Min Rotation" step={0.01} />
                    <InspectorVector3 object={this.selectedObject} property="randomRotationMax" label="Random Max Rotation" step={0.01} />
                </InspectorSection>

                <InspectorSection title="Painting">
                    <InspectorBoolean object={this.selectedObject} property="holdToPaint" label="Hold To Paint" />
                    <InspectorNumber object={this.selectedObject} property="paintDistance" label="Pain Distance" step={0.01} />
                </InspectorSection>
            </>
        );
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        super.componentWillUnmount();

        this.selectedObject.dispose();
    }

    /**
     * Called on the user drops an element in the zone.
     */
    private _handleNodeDropped(e: React.DragEvent<HTMLImageElement>): void {
        (e.currentTarget as HTMLImageElement).style.border = "dashed black 1px";
        if (!e.dataTransfer) { return; }
        
        const data = e.dataTransfer.getData("graph/node");
        if (!data) { return; }

        try {
            const parsedData = JSON.parse(data);
            const node = this.editor.scene!.getMeshByID(parsedData.nodeId);

            if (node && node instanceof Mesh) {
                this.selectedObject.setMesh(node);
                this.setState({ selectedMesh: node });
            }
        } catch (e) {
            // Catch silently.
        }
    }
}

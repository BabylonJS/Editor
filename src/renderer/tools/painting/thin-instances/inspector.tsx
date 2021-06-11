import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { Divider, H4 } from "@blueprintjs/core";

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
    /**
     * Defines the number of active instances
     */
    instancesCount: number;
}

export class ThinInstancePainterInspector extends AbstractInspector<ThinInstancePainter, IThinInstancePainterState> {
    private static _serializedConfiguration: Nullable<any> = null;

    private _intervalId: NodeJS.Timeout;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.selectedObject = new ThinInstancePainter(this.editor);
        if (ThinInstancePainterInspector._serializedConfiguration) {
            this.selectedObject.parse(ThinInstancePainterInspector._serializedConfiguration);
        }

        this.state = {
            selectedMesh: this.selectedObject._selectedMesh,
            instancesCount: 0,
        };
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        const meshMaterial = this.state.selectedMesh?.material ?? this.editor.scene!.defaultMaterial;
        const materialAsset = this.editor.assets.getComponent(MaterialAssets)?.getAssetFromMaterial(meshMaterial);

        return (
            <>
                <Divider />
                <H4 style={{ textAlign: "center" }}>Thin Instances Painter</H4>
                <InspectorSection title="Material">
                    <div style={{ width: "100%", height: "170px" }}>
                        <div style={{  height: "100px" }}>
                            <img
                                src={this.state.selectedMesh && materialAsset ? materialAsset.base64 : "../css/svg/plus.svg"}
                                style={{ border: "dashed black 1px", objectFit: "contain", width: "100%", height: "100%" }}
                                onDragEnter={(e) => (e.currentTarget as HTMLImageElement).style.border = "dashed red 1px"}
                                onDragLeave={(e) => (e.currentTarget as HTMLImageElement).style.border = "dashed black 1px"}
                                onDrop={(e) => this._handleNodeDropped(e)}
                            ></img>
                        </div>
                        <H4 style={{ lineHeight: "40px", textAlign: "center" }}>{this.state.selectedMesh?.name ?? "None Selected"}</H4>
                        <span>Intances Count: {this.state.instancesCount}</span>
                    </div>
                </InspectorSection>

                <InspectorSection title="Random Rotation">
                    <InspectorVector3 object={this.selectedObject} property="randomRotationMin" label="Random Min Rotation" step={0.01} />
                    <InspectorVector3 object={this.selectedObject} property="randomRotationMax" label="Random Max Rotation" step={0.01} />
                </InspectorSection>

                <InspectorSection title="Random Scaling">
                    <InspectorVector3 object={this.selectedObject} property="randomScalingMin" label="Random Min Scaling" step={0.01} />
                    <InspectorVector3 object={this.selectedObject} property="randomScalingMax" label="Random Max Scaling" step={0.01} />
                </InspectorSection>

                <InspectorSection title="Painting">
                    <InspectorBoolean object={this.selectedObject} property="holdToPaint" label="Hold To Paint" />
                    <InspectorNumber object={this.selectedObject} property="paintDistance" label="Pain Distance" step={0.01} />
                </InspectorSection>
            </>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        super.componentDidMount();

        this._intervalId = setInterval(() => {
            this.setState({
                instancesCount: this.state.selectedMesh?.thinInstanceCount ?? 0,
            });
        }, 500);
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        super.componentWillUnmount();

        clearInterval(this._intervalId);
        ThinInstancePainterInspector._serializedConfiguration = this.selectedObject.serialize();
        this.selectedObject.dispose();
    }

    /**
     * Called on a property of the selected object has changed.
     */
    public onPropertyChanged(): void {
        if (this.state.selectedMesh) {
            this.setState({ instancesCount: this.state.selectedMesh.thinInstanceCount });
        }
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
                this.setState({ selectedMesh: node, instancesCount: node.thinInstanceCount });
            }
        } catch (e) {
            // Catch silently.
        }
    }
}

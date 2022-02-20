import { join } from "path";

import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { Divider, H4 } from "@blueprintjs/core";

import { Mesh } from "babylonjs";

import { InspectorNumber } from "../../../editor/gui/inspector/fields/number";
import { InspectorSection } from "../../../editor/gui/inspector/fields/section";
import { InspectorVector3 } from "../../../editor/gui/inspector/fields/vector3";
import { InspectorBoolean } from "../../../editor/gui/inspector/fields/boolean";

import { Tools } from "../../../editor/tools/tools";

import { WorkSpace } from "../../../editor/project/workspace";

import { Workers } from "../../../editor/workers/workers";
import AssetsWorker from "../../../editor/workers/workers/assets";

import { AssetsBrowserItemHandler } from "../../../editor/components/assets-browser/files/item-handler";

import { ThinInstancePainter } from "../../../editor/painting/thin-instance/thin-instance";

import { IObjectInspectorProps } from "../../../editor/components/inspector";
import { AbstractInspector } from "../../../editor/components/inspectors/abstract-inspector";

export interface IThinInstancePainterState {
    /**
     * Defines the preview of the mesh.
     */
    assetPreview?: string;
    /**
     * Defines the number of active instances
     */
    instancesCount: number;
    /**
     * Defines the reference to the current mesh being duplicated using
     * thin instances.
     */
    selectedMesh: Nullable<Mesh>;
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
            instancesCount: 0,
            selectedMesh: this.selectedObject._selectedMesh,
        };
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                <Divider />
                <H4 style={{ textAlign: "center" }}>Thin Instances Painter</H4>
                <InspectorSection title="Material">
                    <div style={{ width: "100%" }}>
                        <div data-tooltip={this.state.selectedMesh ? undefined : "No Object Selected."} style={{ height: "100px" }}>
                            <img
                                src={this.state.selectedMesh && this.state.assetPreview ? this.state.assetPreview : "../css/svg/question-mark.svg"}
                                style={{ border: "dashed black 1px", objectFit: "contain", width: "100%", height: "100%" }}
                                onDragEnter={(e) => (e.currentTarget as HTMLImageElement).style.border = "dashed red 1px"}
                                onDragLeave={(e) => (e.currentTarget as HTMLImageElement).style.border = "dashed black 1px"}
                                onDrop={(e) => this._handleNodeDropped(e)}
                            ></img>
                        </div>
                        <span style={{ display: "block" }}>{this.state.selectedMesh?.name ?? "None Selected"}</span>
                        <span style={{ display: "block" }}>Intances Count: {this.state.instancesCount}</span>
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

        if (this.selectedObject._selectedMesh) {
            this._updateAssetPreview(this.selectedObject._selectedMesh);
        }

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
    private async _handleNodeDropped(e: React.DragEvent<HTMLImageElement>): Promise<void> {
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

                this._updateAssetPreview(node);
            }
        } catch (e) {
            // Catch silently.
        }
    }

    /**
     * Gets and sets the preview of the given mesh from assets browser.
     */
    private async _updateAssetPreview(mesh: Mesh): Promise<void> {
        const meshMetadata = Tools.GetMeshMetadata(mesh);
        const relativePath = meshMetadata.originalSourceFile?.sceneFileName;

        // Get mesh preview
        if (relativePath) {
            const assetPreview = await Workers.ExecuteFunction<AssetsWorker, "createScenePreview">(
                AssetsBrowserItemHandler.AssetWorker,
                "createScenePreview",
                relativePath,
                join(WorkSpace.DirPath!, relativePath),
            );
    
            return this.setState({ assetPreview });
        }

        // Try with material preview
        if (mesh.material) {
            const materialMetadata = Tools.GetMaterialMetadata(mesh.material);
            if (materialMetadata.editorPath) {
                const assetPreview = await Workers.ExecuteFunction<AssetsWorker, "createScenePreview">(
                    AssetsBrowserItemHandler.AssetWorker,
                    "createScenePreview",
                    materialMetadata.editorPath,
                    join(WorkSpace.DirPath!, materialMetadata.editorPath),
                );
        
                return this.setState({ assetPreview });
            }
        }
    }
}

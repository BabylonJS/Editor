import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { Divider, H4, NonIdealState } from "@blueprintjs/core";

import { Mesh } from "babylonjs";

import { InspectorNumber } from "../../../editor/gui/inspector/fields/number";
import { InspectorSection } from "../../../editor/gui/inspector/fields/section";
import { InspectorVector3 } from "../../../editor/gui/inspector/fields/vector3";
import { InspectorBoolean } from "../../../editor/gui/inspector/fields/boolean";

import { Tools } from "../../../editor/tools/tools";

import { FoliagePainter } from "../../../editor/painting/foliage/foliage";

import { IObjectInspectorProps } from "../../../editor/components/inspector";
import { AbstractInspector } from "../../../editor/components/inspectors/abstract-inspector";
import { FoliageAssetItem } from "./item";

export interface IFoliagePainterState {
    /**
     * Defines the preview of the mesh.
     */
    assetPreviews: Nullable<string>[];
    /**
     * Defines the reference to the current mesh being duplicated using
     * thin instances.
     */
    selectedMeshes: Nullable<Mesh>[];
}

export class FoliagePainterInspector extends AbstractInspector<FoliagePainter, IFoliagePainterState> {
    private static _serializedConfiguration: Nullable<any> = null;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.selectedObject = new FoliagePainter(this.editor);
        if (FoliagePainterInspector._serializedConfiguration) {
            this.selectedObject.parse(FoliagePainterInspector._serializedConfiguration);
        }

        this.state = {
            assetPreviews: [],
            selectedMeshes: [],
        };
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                <Divider />
                <H4 style={{ textAlign: "center" }}>Foliage Painter</H4>
                <InspectorSection title="Meshes">
                    <div
                        style={{ minHeight: "200px" }}
                        onDrop={(e) => this._handleAssetsDropped(e)}
                    >
                        {this._getMeshesSection()}
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
    public async componentDidMount(): Promise<void> {
        super.componentDidMount();

        this.setState({
            selectedMeshes: this.selectedObject._selectedMeshes,
            assetPreviews: await Promise.all(this.selectedObject._selectedMeshes.map((m) => this._getMeshPreview(m))),
        });
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        super.componentWillUnmount();

        FoliagePainterInspector._serializedConfiguration = this.selectedObject.serialize();
        this.selectedObject.dispose();
    }

    /**
     * Called on a property of the selected object has changed.
     */
    public onPropertyChanged(): void {

    }

    /**
     * Returns the element used to render the 
     */
    private _getMeshesSection(): React.ReactNode {
        if (!this.state.selectedMeshes.length) {
            return (
                <NonIdealState
                    icon="search"
                    title="No Asset"
                    description="Drop assets from graph here to start painting."
                />
            );
        }

        const previews = this.state.assetPreviews.map((ap, index) => (
            <FoliageAssetItem preview={ap} title={this.state.selectedMeshes[index]!.name} />
        ));

        return (
            <div
                style={{
                    width: "100%",
                    display: "grid",
                    overflow: "auto",
                    position: "absolute",
                    height: "calc(100% - 70px)",
                    gridTemplateRows: "repeat(auto-fill, 120px)",
                    gridTemplateColumns: "repeat(auto-fill, 120px)",
                }}
            >
                {previews}
            </div>
        );
    }

    /**
     * Called on the user drops elements in the tool.
     */
    private async _handleAssetsDropped(e: React.DragEvent<HTMLDivElement>): Promise<void> {
        if (!e.dataTransfer) {
            return;
        }

        // Dropped nodes?
        const data = e.dataTransfer.getData("graph/node");
        if (data) {
            return this._handleNodesDropped(data);
        }
    }

    /**
     * Called on the user drops nodes from the graph in the tool.
     */
    private async _handleNodesDropped(data: string): Promise<void> {
        try {
            const parsedData = JSON.parse(data);
            const selectedMeshes = parsedData.allNodeIds.map((nid) => this.editor.scene!.getMeshByID(nid)).filter((n) => n) as Mesh[];
            const assetPreviews = await Promise.all(selectedMeshes.map((m) => this._getMeshPreview(m)));

            this.selectedObject.setMeshes(selectedMeshes);
            this.setState({ selectedMeshes, assetPreviews });
        } catch (e) {
            // Catch silently.
        }
    }

    /**
     * Returns the preview of the given mesh.
     */
    private async _getMeshPreview(mesh: Mesh): Promise<Nullable<string>> {
        const meshMetadata = Tools.GetMeshMetadata(mesh);
        const relativePath = meshMetadata.originalSourceFile?.sceneFileName;

        if (relativePath) {
            return this.editor.assetsBrowser.getAssetPreview(relativePath);
        }

        // Try with material
        if (mesh.material) {
            const materialMetadata = Tools.GetMaterialMetadata(mesh.material);
            if (materialMetadata.editorPath) {
                return this.editor.assetsBrowser.getAssetPreview(materialMetadata.editorPath);
            }
        }

        return null;
    }
}

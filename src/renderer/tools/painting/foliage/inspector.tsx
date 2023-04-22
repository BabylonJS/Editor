import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { Divider, H4, NonIdealState, Tab, Tabs } from "@blueprintjs/core";

import { Mesh } from "babylonjs";

import { InspectorNumber } from "../../../editor/gui/inspector/fields/number";
import { InspectorSection } from "../../../editor/gui/inspector/fields/section";
import { InspectorVector3 } from "../../../editor/gui/inspector/fields/vector3";
import { InspectorBoolean } from "../../../editor/gui/inspector/fields/boolean";

import { Tools } from "../../../editor/tools/tools";

import { FoliagePainter, FoliageToolType } from "../../../editor/painting/foliage/foliage";

import { IObjectInspectorProps } from "../../../editor/components/inspector";
import { AbstractInspector } from "../../../editor/components/inspectors/abstract-inspector";

import { FoliageAssetItem } from "./item";

export interface IFoliagePainterState {
    /**
     * Defines the current id of the selected tab.
     */
    selectedTabId: FoliageToolType;

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

    private _items: FoliageAssetItem[] = [];

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
            selectedTabId: "add",

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
                <H4 style={{ textAlign: "center", margin: "10px 0px 10px 0px" }}>Foliage Painter</H4>
                <InspectorSection title="Meshes">
                    <div
                        style={{ minHeight: "200px", backgroundColor: "#333333", borderRadius: "10px", borderColor: "black" }}
                        onDrop={(e) => this._handleAssetsDropped(e)}
                    >
                        {this._getMeshesSection()}
                    </div>
                </InspectorSection>

                <div style={{ display: "flex", justifyContent: "center" }}>
                    <Tabs
                        animate
                        selectedTabId={this.state.selectedTabId}
                        onChange={(id) => {
                            this.selectedObject.toolType = id as FoliageToolType;
                            this.setState({ selectedTabId: id as FoliageToolType });
                        }}
                    >
                        <Tab id="add" title="Add" />
                        <Tab id="scale" title="Scale" />
                    </Tabs>
                </div>

                {this.getAddInspector()}
                {this.getScaleInspector()}
            </>
        );
    }

    /**
     * Returns the inspector used to add / remove instances.
     */
    protected getAddInspector(): React.ReactNode {
        if (this.state.selectedTabId !== "add") {
            return undefined;
        }

        return (
            <>
                <InspectorSection title="Random Rotation">
                    <InspectorVector3 object={this.selectedObject} property="randomRotationMin" label="Random Min Rotation" step={0.01} />
                    <InspectorVector3 object={this.selectedObject} property="randomRotationMax" label="Random Max Rotation" step={0.01} />
                </InspectorSection>

                <InspectorSection title="Random Scaling">
                    <InspectorNumber object={this.selectedObject} property="randomScalingMin" label="Min" step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="randomScalingMax" label="Max" step={0.01} />

                    <InspectorNumber object={this.selectedObject.scalingFactor} property="x" label="Factor" step={0.01} onChange={(v) => {
                        this.selectedObject.scalingFactor.setAll(v);
                    }} />
                </InspectorSection>

                <InspectorSection title="Painting">
                    <InspectorBoolean object={this.selectedObject} property="holdToPaint" label="Hold To Paint" />
                    <InspectorNumber object={this.selectedObject} property="density" label="Density" min={0} step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="distance" label="Distance" min={0} step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="size" label="Size" min={0} step={0.01} />
                </InspectorSection>
            </>
        );
    }

    /**
     * Returns the inspector used to scale existing instances.
     */
    protected getScaleInspector(): React.ReactNode {
        if (this.state.selectedTabId !== "scale") {
            return undefined;
        }

        return (
            <>
                <InspectorSection title="Value">
                    <InspectorVector3 object={this.selectedObject} property="rescaleValue" label="Value" step={0.01} />
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
        // Nothing to do for now...
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

        this._items = [];

        const previews = this.state.assetPreviews.map((ap, index) => (
            <FoliageAssetItem key={Tools.RandomId()} ref={(r) => r && this._items.push(r)} preview={ap} mesh={this.state.selectedMeshes[index]!} />
        ));

        return (
            <div
                style={{
                    display: "grid",
                    overflow: "auto",
                    position: "absolute",
                    width: "calc(100% - 40px)",
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

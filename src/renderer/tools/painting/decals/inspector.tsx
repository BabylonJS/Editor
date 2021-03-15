import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { H4 } from "@blueprintjs/core";

import { Material } from "babylonjs";

import { MaterialAssets } from "../../../editor/assets/materials";
import { IAssetComponentItem, IDragAndDroppedAssetComponentItem } from "../../../editor/assets/abstract-assets";

import { IObjectInspectorProps } from "../../../editor/components/inspector";
import { AbstractInspector } from "../../../editor/inspectors/abstract-inspector";

import { InspectorList } from "../../../editor/gui/inspector/list";
import { InspectorNumber } from "../../../editor/gui/inspector/number";
import { InspectorSection } from "../../../editor/gui/inspector/section";
import { InspectorBoolean } from "../../../editor/gui/inspector/boolean";
import { InspectorNotifier } from "../../../editor/gui/inspector/notifier";

import { DecalsPainter } from "../../../editor/painting/decals/decals";

export interface IDecalPainterInspectorState {
    /**
     * Defines the reference to the selected material asset component item.
     */
    selectedMaterialAsset: Nullable<IAssetComponentItem>;
}

export class DecalsPainterInspector extends AbstractInspector<DecalsPainter, IDecalPainterInspectorState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.selectedObject = new DecalsPainter(this.editor);

        this.state = {
            selectedMaterialAsset: null,
        };
    }

    /**
     * Renders the content of the inspector.
     */
     public renderContent(): React.ReactNode {
        return (
            <>
                <InspectorSection title="Material">
                    <div style={{ width: "100%", height: "100px" }}>
                        <div style={{ width: "35%", height: "100px", float: "left" }}>
                            <img
                                src={this.state.selectedMaterialAsset?.base64 ?? "../css/svg/magic.svg"}
                                style={{ border: "dashed black 1px", objectFit: "contain", width: "100%", height: "100%" }}
                                onDragEnter={(e) => (e.currentTarget as HTMLImageElement).style.border = "dashed red 1px"}
                                onDragLeave={(e) => (e.currentTarget as HTMLImageElement).style.border = "dashed black 1px"}
                                onDrop={(e) => this._handleMaterialDropped(e)}
                            ></img>
                        </div>
                        <div style={{ width: "65%", height: "100px", float: "left" }}>
                            <H4 style={{ lineHeight: "100px", textAlign: "center" }}>{this.state.selectedMaterialAsset?.id ?? "None Selected"}</H4>
                        </div>
                    </div>
                    <InspectorList object={this.selectedObject} property="material" label="Material" items={() => this.getMaterialsList()} onChange={(m: Nullable<Material>) => {
                        const asset = this.editor.assets.getAssetsOf(MaterialAssets)?.find((a) => a.key === m?.id) ?? null;
                        this.setState({ selectedMaterialAsset: asset });
                    }} />
                </InspectorSection>
                <InspectorSection title="Options">
                    <InspectorNumber object={this.selectedObject} property="angle" label="Angle" min={-Math.PI} max={Math.PI} step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="size" label="Size" min={0} step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="width" label="Width" min={0} step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="height" label="Height" min={0} step={0.01} />
                    <InspectorBoolean object={this.selectedObject} property="receiveShadows" label="Receive Shadows" />
                </InspectorSection>
            </>
        );
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        super.componentWillUnmount();

        this.selectedObject?.dispose();
    }

    /**
     * Called on the user dropped a material in the material box.
     */
    private _handleMaterialDropped(e: React.DragEvent<HTMLImageElement>): void {
        (e.currentTarget as HTMLImageElement).style.border = "dashed black 1px";
        if (!e.dataTransfer) { return; }

        try {
            const data = JSON.parse(e.dataTransfer.getData("application/material")) as IDragAndDroppedAssetComponentItem;
            const asset = this.editor.assets.getAssetsOf(MaterialAssets)?.find((a) => a.key === data.key) ?? null;

            if (asset) {
                this.selectedObject.material = this.editor.scene!.getMaterialByID(asset.key);
            }
            this.setState({ selectedMaterialAsset: asset }, () => {
                InspectorNotifier.NotifyChange(this.selectedObject);
            });
        } catch (e) {
            // Catch silently;
        }
    }
}

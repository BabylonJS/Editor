import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { Animation } from "babylonjs";

import { InspectorList } from "../../../editor/gui/inspector/fields/list";
import { InspectorString } from "../../../editor/gui/inspector/fields/string";
import { InspectorButton } from "../../../editor/gui/inspector/fields/button";
import { InspectorSection } from "../../../editor/gui/inspector/fields/section";

import { Tools } from "../../../editor/tools/tools";

import { Inspector, IObjectInspectorProps } from "../../../editor/components/inspector";
import { AbstractInspector } from "../../../editor/components/inspectors/abstract-inspector";

import { ICinematicTrack } from "../../../editor/cinematic/base";

import { Tracks } from "../panels/tracks";

import { CinematicInspectorGroupSelector } from "./components/group-selector";

export class CinematicPropertyGroupTrack {
    /**
     * Defines the id of the cinematic animation key object.
     */
    public id: string = Tools.RandomId();

    /**
     * Constructor.
     */
    public constructor(public track: ICinematicTrack, public tracks: Nullable<Tracks>) {
        // Empty for now...
    }
}

export interface ICinematicPropertyTrackInspectorState {
    // Nothing for now...
}

export class CinematicPropertyGroupTrackInspector extends AbstractInspector<CinematicPropertyGroupTrack, ICinematicPropertyTrackInspectorState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.state = {
            ...this.state,
        };
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        const nodes = this.selectedObject.track.propertyGroup!.nodeIds.map((_, index) => {
            return this._getNodeIdField(index);
        });

        nodes.push(<InspectorButton small label="Add..." onClick={() => this._handleAddNode()} />);

        return (
            <InspectorSection title="Animation Key">
                <InspectorString key={Tools.RandomId()} object={this.selectedObject.track.propertyGroup} property="propertyPath" label="Property Path" onFinishChange={() => {
                    this.selectedObject.tracks?.refreshTracks();
                }} />
                <InspectorList key={Tools.RandomId()} object={this.selectedObject.track.propertyGroup} property="animationType" label="Type" items={[
                    { label: "Float", data: Animation.ANIMATIONTYPE_FLOAT },
                    { label: "Vector2", data: Animation.ANIMATIONTYPE_VECTOR2 },
                    { label: "Vector3", data: Animation.ANIMATIONTYPE_VECTOR3 },
                    { label: "Quaternion", data: Animation.ANIMATIONTYPE_QUATERNION },
                    { label: "Color3", data: Animation.ANIMATIONTYPE_COLOR3 },
                    { label: "Color4", data: Animation.ANIMATIONTYPE_COLOR4 },
                    { label: "Matrix", data: Animation.ANIMATIONTYPE_MATRIX },
                ]} />
                <InspectorSection title="Nodes" children={nodes} />
                <CinematicInspectorGroupSelector track={this.selectedObject.track} tracks={this.selectedObject.tracks} />
            </InspectorSection>
        );
    }

    /**
     * Called on the user wants to add a new node to the property group.
     */
    private _handleAddNode(): void {
        this.selectedObject.track.propertyGroup!.nodeIds.push(undefined!);
        this.forceUpdate();
    }

    /**
     * Returns the reference to a field used to edit the node at the given index for the property group.
     */
    private _getNodeIdField(index: number): React.ReactNode {
        const o = { nodeId: this.selectedObject.track.propertyGroup!.nodeIds[index] ?? undefined };

        return (
            <InspectorList key={Tools.RandomId()} object={o} property="nodeId" label="Node" noUndoRedo borderLeftColor="forestgreen" dndHandledTypes={["graph/node"]} items={() => {
                const node = this.editor.scene?.getNodeById(o.nodeId ?? "");
                return [
                    { label: node?.name ?? "None", data: node?.id },
                    { label: "Scene", data: "__editor__scene__" },
                ];
            }} onChange={(v) => {
                if (v) {
                    this.selectedObject.track.propertyGroup!.nodeIds[index] = v;
                } else {
                    this.selectedObject.track.propertyGroup!.nodeIds.splice(index, 1);
                }

                this.forceUpdate();
            }} />
        )
    }
}

Inspector.RegisterObjectInspector({
    ctor: CinematicPropertyGroupTrackInspector,
    ctorNames: ["CinematicPropertyGroupTrack"],
    title: "Property Group Track",
});

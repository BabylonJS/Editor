import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { Tree, ITreeNode, ContextMenu, Menu, MenuItem } from "@blueprintjs/core";

import { Node, AnimationRange } from "babylonjs";

import { IObjectInspectorProps } from "../inspector";

import { Icon } from "../../gui/icon";
import { Alert } from "../../gui/alert";
import { Dialog } from "../../gui/dialog";

import { InspectorString } from "../../gui/inspector/fields/string";
import { InspectorButton } from "../../gui/inspector/fields/button";
import { InspectorNumber } from "../../gui/inspector/fields/number";
import { InspectorBoolean } from "../../gui/inspector/fields/boolean";
import { InspectorSection } from "../../gui/inspector/fields/section";

import { undoRedo } from "../../tools/undo-redo";

import { AnimationGroupComponent } from "./tools/animation-groups";
import { IScriptInspectorState, ScriptInspector } from "./script-inspector";

export interface INodeInspectorState extends IScriptInspectorState {
    /**
     * Defines weher or not the node is enabled.
     */
    enabled: boolean;
    /**
     * Defines the reference to the selected animation range.
     */
    selectedAnimationRange: Nullable<AnimationRange>;
}

export class NodeInspector<T extends Node, S extends INodeInspectorState> extends ScriptInspector<T, S> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.state = {
            ...this.state,
            selectedAnimationRange: null,
            enabled: this.selectedObject.isEnabled(),
        };
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                <InspectorSection title="Common">
                    <InspectorString object={this.selectedObject} property="name" label="Name" noUndoRedo={true} onFinishChange={(v, o) => this._handleNameChanged(v, o)} />
                    <InspectorBoolean object={this.state} property="enabled" label="Enabled" noUndoRedo={true} onFinishChange={(v, o) => this._handleEnabledChange(v, o)} />
                </InspectorSection>

                {super.renderContent()}
            </>
        );
    }

    /**
     * Returns the inspector used to edit the animation groups linked to the node.
     */
    protected getAnimationsGroupInspector(): React.ReactNode {
        return (
            <InspectorSection title="Animation Groups">
                <AnimationGroupComponent scene={this.selectedObject.getScene()} node={this.selectedObject} />
            </InspectorSection>
        );
    }

    /**
     * Returns the inspector used to edit the animation ranges of the node.
     */
    protected getAnimationRangeInspector(): React.ReactNode {
        const ranges = (this.selectedObject.getAnimationRanges() ?? []).filter((r) => r) as AnimationRange[];
        const items = ranges.map((r, index) => ({
            id: index,
            nodeData: r,
            label: r.name,
            secondaryLabel: `(${r.from} - ${r.to})`,
            isSelected: this.state.selectedAnimationRange === r,
        })) as ITreeNode<AnimationRange>[];

        const rangeInspector = this.state.selectedAnimationRange ? (
            <InspectorSection title={`"${this.state.selectedAnimationRange.name}" Parameters`}>
                <InspectorNumber object={this.state.selectedAnimationRange} property="from" label="From" min={0} onFinishChange={() => this.forceUpdate()} />
                <InspectorNumber object={this.state.selectedAnimationRange} property="to" label="To" min={0} onFinishChange={() => this.forceUpdate()} />
            </InspectorSection>
        ) : undefined;

        return (
            <InspectorSection title="Animation Ranges">
                <InspectorButton small label="Add..." onClick={() => this._handleAddAnimationRange()} />
                <div style={{ width: "100%", height: "200px", overflow: "auto", backgroundColor: "#222222" }}>
                    <Tree
                        contents={items}
                        onNodeClick={(n) => this._handleAnimationRangeNodeClick(n)}
                        onNodeContextMenu={(n, _, e) => this._handleAnimationRangeNodeContextMenu(n, e)}
                    />
                </div>
                {rangeInspector}
            </InspectorSection>
        );
    }

    /**
     * Called on the user changed the name of the node.
     */
    private _handleNameChanged(name: string, oldName: string): void {
        undoRedo.push({
            description: `Renamed node from "${oldName}" to "${name}"`,
            common: () => {
                this.forceUpdate();
                this.editor.graph.refresh();
            },
            undo: () => this.selectedObject.name = oldName,
            redo: () => this.selectedObject.name = name,
        })
        this.editor.graph.refresh();
    }

    /**
     * Called on the node is set to enabled/disabled.
     */
    private _handleEnabledChange(enabled: boolean, wasEnabled: boolean): void {
        undoRedo.push({
            description: `Set node enabled from "${wasEnabled}" to "${enabled}"`,
            common: () => this.forceUpdate(),
            undo: () => this.selectedObject.setEnabled(wasEnabled),
            redo: () => this.selectedObject.setEnabled(enabled),
        });
    }

    /**
     * Called on the user wants to add a new animation range.
     */
    private async _handleAddAnimationRange(): Promise<void> {
        const name = await Dialog.Show("Animation Range Name", "Please provide a name for the new animation range");
        if (this.selectedObject.getAnimationByName(name)) {
            return Alert.Show("Can't Add Animation Range", "Can't add animation range as it already exists. Please provide another name.");
        }

        undoRedo.push({
            common: () => this.forceUpdate(),
            undo: () => this.selectedObject.deleteAnimationRange(name, false),
            redo: () => this.selectedObject.createAnimationRange(name, 0, 1),
        });
    }

    /**
     * Called on the user selects an animation range in the list.
     */
    private _handleAnimationRangeNodeClick(node: ITreeNode<AnimationRange>): void {
        this.setState({ selectedAnimationRange: node.nodeData ?? null });
    }

    /**
     * Called on the user right-clicks on an animation range in the list.
     */
    private _handleAnimationRangeNodeContextMenu(node: ITreeNode<AnimationRange>, ev: React.MouseEvent<HTMLElement, MouseEvent>): void {
        if (!node.nodeData) {
            return;
        }

        this._handleAnimationRangeNodeClick(node);

        ContextMenu.show((
            <Menu>
                <MenuItem text="Rename..." icon={<Icon src="edit.svg" />} onClick={() => this._handleRenameAnimationRange(node.nodeData!)} />
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => this._handleRemoveAnimationRange(node.nodeData!)} />
            </Menu>
        ), {
            left: ev.clientX,
            top: ev.clientY,
        });
    }

    /**
     * Called on the user wants to rename an existing animation range in the list.
     */
    private async _handleRenameAnimationRange(range: AnimationRange): Promise<void> {
        const name = await Dialog.Show("New Animation Range Name", "Please provide the new name of the animation range.");
        const existing = this.selectedObject.getAnimationRanges().find((r) => r?.name === name);
        if (existing) {
            return Alert.Show("Can't Rename Animation Range", `An animation range named "${name}" already exists. Please provide another name.`);
        }

        const oldName = range.name;

        undoRedo.push({
            common: () => this.forceUpdate(),
            undo: () => range.name = oldName,
            redo: () => range.name = name,
        });
    }

    /**
     * Called on the user wants to remove the given animation range.
     */
    private _handleRemoveAnimationRange(range: AnimationRange): void {
        this.setState({ selectedAnimationRange: null });

        undoRedo.push({
            description: `Removed animation range named "${range.name}" from object "${this.selectedObject.name}"`,
            common: () => this.forceUpdate(),
            undo: () => this.selectedObject.createAnimationRange(range.name, range.from, range.to),
            redo: () => this.selectedObject.deleteAnimationRange(range.name, false),
        });
    }
}

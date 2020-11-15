import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { Button, ContextMenu, Divider, ITreeNode, Menu, MenuItem, Tree, NonIdealState } from "@blueprintjs/core";

import { Animation, AnimationRange } from "babylonjs";

import { Icon } from "../../../editor/gui/icon";
import { Alert } from "../../../editor/gui/alert";
import { Dialog } from "../../../editor/gui/dialog";
import { undoRedo } from "../../../editor/tools/undo-redo";

export interface IAnimationRangesProps {
    /**
     * Defines the reference to the animation.
     */
    animation: Animation;
    /**
     * Defines the callback called on the user selected a range in the list.
     */
    onRangeSelected: (range: Nullable<AnimationRange>) => void;
}

export interface IAnimationRangesState {
    /**
     * Defines the list of all available ranges.
     */
    ranges: ITreeNode<AnimationRange>[];
}

export class AnimationRanges extends React.Component<IAnimationRangesProps, IAnimationRangesState> {
    private _mounted: boolean = false;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IAnimationRangesProps) {
        super(props);

        this.state = {
            ranges: this._getRanges(),
        };
        
        if (this.state.ranges.length) {
            this._handleNodeClicked(this.state.ranges[0]);
        }
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const addButton = <Button text="Add..." fill={true} small={true} style={{ width: "calc(100% - 13px)" }} onClick={() => this._handleAddRange()} />;

        if (!this.state.ranges.length) {
            return (
                <>
                    {addButton}
                    <Divider />
                    <NonIdealState
                        title="No Animation Range."
                        description="Please add at least one animation range."
                        icon="search"
                    />
                </>
            );
        }

        return (
            <>
                {addButton}
                <Divider />
                <Tree
                    contents={this.state.ranges}
                    onNodeClick={(n) => this._handleNodeClicked(n as ITreeNode<AnimationRange>)}
                    onNodeContextMenu={(n, _, e) => this._handleNodeContextMenu(n as ITreeNode<AnimationRange>, e)}
                />
            </>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        this._mounted = true;
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        this._mounted = false;
    }

    /**
     * Returns the list of all available ranges as tree nodes.
     */
    private _getRanges(): ITreeNode<AnimationRange>[] {
        const result: ITreeNode<AnimationRange>[] = [];

        for (const key in this.props.animation["_ranges"] ?? { }) {
            const range = this.props.animation["_ranges"][key] as AnimationRange;
            if (!range) { continue; }

            result.push({
                id: key,
                label: range.name,
                nodeData: range,
            });
        }

        return result;
    }

    /**
     * Called on the user wants to add a new range.
     */
    private async _handleAddRange(): Promise<void> {
        const name = await Dialog.Show("Range Name", "Please provide a name for the new range.");
        if (this.props.animation.getRange(name)) {
            return Alert.Show("Range already exists", `A range named "${name}" already exists, please change the name.`);
        }

        this.props.animation.createRange(name, 0, 60);

        this.setState({ ranges: this._getRanges() }, () => {
            this._handleNodeClicked(this.state.ranges[this.state.ranges.length - 1])
        });
    }

    /**
     * Called on the user clicks on a node.
     */
    private _handleNodeClicked(node: ITreeNode<AnimationRange>): void {
        this.state.ranges.forEach((r) => r.isSelected = false);
        if (node) {
            node.isSelected = true;
        }

        this.props.onRangeSelected(node?.nodeData ?? null);
        this.setState({ ranges: this.state.ranges });
    }

    /**
     * Called on the user right-clicks on a node.
     */
    private _handleNodeContextMenu(node: ITreeNode<AnimationRange>, ev: React.MouseEvent<HTMLElement>): void {
        this._handleNodeClicked(node);

        ContextMenu.show((
            <Menu>
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => {
                    const range = node.nodeData!;
                    undoRedo.push({
                        common: () => {
                            if (this._mounted) {
                                this.setState({ ranges: this._getRanges() }, () => {
                                    this._handleNodeClicked(this.state.ranges[0] ?? null);
                                });
                            }
                        },
                        undo: () => this.props.animation.createRange(range.name, range.from, range.to),
                        redo: () => this.props.animation.deleteRange(range.name, false),
                    });
                }} />
            </Menu>
        ), {
            left: ev.clientX,
            top: ev.clientY,
        });
    }
}

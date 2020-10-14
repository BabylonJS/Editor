import { Nullable } from "../../../shared/types";

import * as React from "react";
import {
    Button, NonIdealState, Tree, ITreeNode, Classes,
    IconName, ContextMenu, Menu, MenuItem, Tag, Callout,
} from "@blueprintjs/core";
import Space from "antd/lib/space";

import { Animation, IAnimatable } from "babylonjs";

import { Icon } from "../../editor/gui/icon";

import { undoRedo } from "../../editor/tools/undo-redo";

import { AddAnimation } from "./add-animation";

export interface IAnimationPanelProps {
    /**
     * Defines the reference to the selected animatable.
     */
    selectedAnimatable: Nullable<IAnimatable>;
    /**
     * Defines the callback called on the user selects an animation.
     */
    onSelectedAnimation: (animation: Nullable<Animation>) => void;
}

export interface IAnimationPanelState {
    /**
     * Defines the reference to the selected animatable.
     */
    selectedAnimatable: Nullable<IAnimatable>;
    /**
     * Defines the list of all available animations.
     */
    animations: ITreeNode<Animation>[];
}

export class AnimationsPanel extends React.Component<IAnimationPanelProps, IAnimationPanelState> {
    private _addAnimation: Nullable<AddAnimation> = null;
    private _refHandler = {
        getAddAnimation: (ref: AddAnimation) => this._addAnimation = ref,
    };

    /**
     * Constructor.
     * @param props defines the props of the component.
     */
    public constructor(props: IAnimationPanelProps) {
        super(props);

        this.state = {
            animations: [],
            selectedAnimatable: props.selectedAnimatable,
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        if (!this.state.selectedAnimatable) {
            return null;
        }

        let noAnimation: React.ReactNode;
        let animationsList: React.ReactNode;

        if (!this.state.selectedAnimatable?.animations?.length) {
            noAnimation = (
                <NonIdealState
                    icon="search"
                    title="No animation."
                    description={`No animation available. To select and edit animations, please add at least one animation by clikcing on the button "Add..."`}
                />
            );
        } else {
            animationsList = (
                <>
                    <Tag fill={true}>{this.state.selectedAnimatable.animations.length} item(s)</Tag>
                    {/* <Divider style={{ backgroundColor: "#333333", borderRadius: "5px", paddingLeft: "3px" }}>Available Animations</Divider> */}
                    <Tree
                        className={Classes.ELEVATION_0}
                        contents={this.state.animations}
                        onNodeClick={(n) => this._handleNodeClick(n)}
                        onNodeContextMenu={(n, _, e) => this._handleNodeContextMenu(n, e)}
                    />
                </>
            );
        }

        return (
            <Space direction="vertical" style={{ width: "100%" }}>
                <Callout title="Actions">
                    <Button text="Add..." small={true} fill={true} onClick={() => this._handleAddAnimation()} />
                </Callout>
                <Callout title="Animations">
                    {noAnimation}
                    {animationsList}
                </Callout>
                <AddAnimation ref={this._refHandler.getAddAnimation} onAnimationAdded={(a) => this._handleAnimationAdded(a)} />
            </Space>
        );
    }

    /**
     * Sets the new animatable to edit.
     * @param animatable defines the reference to the animatable.
     */
    public setAnimatable(animatable: IAnimatable): void {
        this.setState({
            selectedAnimatable: animatable,
            animations: this._refreshAnimationsList(animatable),
        });
    }

    /**
     * Called on the user wants to add a new animation.
     */
    private async _handleAddAnimation(): Promise<void> {
        if (!this._addAnimation || !this.state.selectedAnimatable) { return; }

        this._addAnimation.showWithAnimatable(this.state.selectedAnimatable);
    }

    /**
     * Called on an animation has been added.
     */
    private _handleAnimationAdded(animation: Animation): void {
        this.props.onSelectedAnimation(animation);
        this.setState({ animations: this._refreshAnimationsList() });
    }

    /**
     * Refreshes the list of available animations.
     */
    private _refreshAnimationsList(animatable: Nullable<IAnimatable> = this.state.selectedAnimatable): ITreeNode<Animation>[] {
        if (!animatable) { return []; }

        const getIcon = (a: Animation): (React.ReactNode | IconName) => {
            switch (a.dataType) {
                case Animation.ANIMATIONTYPE_FLOAT: return "id-number" as IconName;
                case Animation.ANIMATIONTYPE_VECTOR2:
                case Animation.ANIMATIONTYPE_VECTOR3:
                    return <Icon src="arrows-alt.svg" />;
                default: return undefined;
            }
        };

        return animatable.animations?.map((a, index) => ({
            id: index,
            label: a.name,
            secondaryLabel: <p style={{ marginBottom: "0px", opacity: 0.7 }}>({a.targetProperty.length > 20 ? a.targetProperty.substr(0, 20) : a.targetProperty})</p>,
            icon: getIcon(a),
            nodeData: a,
        } as ITreeNode<Animation>)) ?? [];
    }

    /**
     * Called on the user clicks on a node.
     */
    private _handleNodeClick(node: ITreeNode<Animation>): void {
        this.state.animations.forEach((n) => n.isSelected = false);
        node.isSelected = true;

        this.props.onSelectedAnimation(node.nodeData!);
        this.setState({ animations: this.state.animations.slice() });
    }

    /**
     * Called ont he user right-clicks on a node.
     */
    private _handleNodeContextMenu(node: ITreeNode<Animation>, ev: React.MouseEvent<HTMLElement, MouseEvent>): void {
        ContextMenu.show(
            <Menu>
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => {
                    if (!this.state.selectedAnimatable?.animations) { return; }

                    const animation = node.nodeData;
                    const animatable = this.state.selectedAnimatable;

                    if (!animation || !animatable?.animations) { return; }

                    undoRedo.push({
                        common: () => this.setState({ animations: this._refreshAnimationsList() }),
                        undo: () => {
                            animatable.animations!.push(animation);
                            this.props.onSelectedAnimation(animation);
                        },
                        redo: () => {
                            const index = animatable.animations!.indexOf(animation);
                            if (index !== -1) {
                                animatable.animations!.splice(index, 1);
                                this.props.onSelectedAnimation(animatable.animations![0] ?? null);
                            }
                        },
                    });
                }} />
            </Menu>,
            { left: ev.nativeEvent.clientX, top: ev.nativeEvent.clientY },
        );
    }
}

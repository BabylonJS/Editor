import { clipboard } from "electron";
import { join, dirname, basename } from "path";

import { Nullable } from "../../../../../shared/types";

import * as React from "react";
import {
    Classes, ContextMenu, Divider, Icon as BPIcon, InputGroup, ITreeNode, Menu,
    MenuDivider, MenuItem, Tree,
} from "@blueprintjs/core";

import { Scene, AnimationGroup, TargetedAnimation, Node, SceneLoader, SceneLoaderAnimationGroupLoadingMode } from "babylonjs";

import { Tools } from "../../../tools/tools";
import { undoRedo } from "../../../tools/undo-redo";

import { Icon } from "../../../gui/icon";

import { InspectorString } from "../../../gui/inspector/fields/string";
import { InspectorButton } from "../../../gui/inspector/fields/button";
import { InspectorSection } from "../../../gui/inspector/fields/section";

export interface IAnimationGroupProps {
    /**
     * Defines the reference to the scene that contains the animation groups.
     */
    scene: Scene;

    /**
     * Defines the optional reference of the node to display only animation groups
     */
    node?: Node;
    /**
     * Defines the height of the list component.
     */
    height?: string;
}

export interface IAnimationGroupState {
    /**
     * Defines the current filter applied to filter animation groups.
     */
    filter: string;
    /**
     * Defines the list of nodes displayed in the tree.
     */
    nodes: ITreeNode<AnimationGroup | TargetedAnimation>[];

    /**
     * Defines the optional reference to the object that is selected in the tree.
     */
    selectedNode?: ITreeNode<AnimationGroup | TargetedAnimation>;
}

export class AnimationGroupComponent extends React.Component<IAnimationGroupProps, IAnimationGroupState> {
    private _selectedAnimationGroup: Nullable<AnimationGroup> = null;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IAnimationGroupProps) {
        super(props);

        this.state = {
            filter: "",
            nodes: this._getAnimationGroupsItems(),
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        if (this.props.node && !this.state.nodes.length) {
            return <h2 style={{ color: "white", textAlign: "center" }}>No animation group linked to the object.</h2>;
        }

        return (
            <>
                <InspectorButton label="Import From File..." onClick={() => this._handleImportAnimationGroupsFromFile()} />
               
                <Divider />
                
                <div style={{ width: "100%", height: "35px" }}>
                    <InputGroup className={Classes.FILL} leftIcon={"search"} type="search" placeholder="Filter..." onChange={(e) => {
                        this.setState({
                            filter: e.target.value,
                            nodes: this._getAnimationGroupsItems(e.target.value),
                        });
                    }} />
                </div>

                <div style={{ width: "100%", height: this.props.height ?? "200px", overflow: "auto", backgroundColor: "#222222" }}>
                    <Tree
                        contents={this.state.nodes}
                        onNodeClick={(n) => this._handleNodeClicked(n)}
                        onNodeExpand={(n) => this._handleNodeExpand(n, true)}
                        onNodeCollapse={(n) => this._handleNodeExpand(n, false)}
                        onNodeContextMenu={(n, _, e) => this._handleNodeContextMenu(n, e)}
                    />
                </div>
                {this._getObjectInspector()}
            </>
        );
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        if (this._selectedAnimationGroup) {
            this._selectedAnimationGroup.goToFrame(this._selectedAnimationGroup.from);
            this._selectedAnimationGroup.stop();
        }
    }

    /**
     * Returns the inspector used to edit the selected object.
     */
    private _getObjectInspector(): React.ReactNode {
        if (!this.state.selectedNode) {
            return undefined;
        }

        const node = this.state.selectedNode;
        const object = node.nodeData;

        if (!object) {
            return undefined;
        }

        if (object instanceof AnimationGroup) {
            this._selectedAnimationGroup = object;

            return (
                <InspectorSection title="Animation Group">
                    <InspectorButton label={object.isPlaying ? "Stop" : "Play"} onClick={() => {
                        object.isPlaying ? object.stop() : object.play();
                        this.forceUpdate();
                    }} />

                    <InspectorString key={Tools.RandomId()} object={object} property="name" label="Name" onFinishChange={(v) => {
                        node.label = v;
                        this.setState({ nodes: this.state.nodes });
                    }} />

                    <InspectorSection key={Tools.RandomId()} title="Informations">
                        <span>Animations Count: {object.targetedAnimations.length}</span>
                        <span>From: {object.from}</span>
                        <span>To: {object.to}</span>
                    </InspectorSection>
                </InspectorSection>
            )
        }
    }

    /**
     * Returns the list of all available animation groups.
     */
    private _getAnimationGroupsItems(filter: string = ""): ITreeNode<AnimationGroup | TargetedAnimation>[] {
        let animationGroups = this.props.scene.animationGroups;
        if (this.props.node) {
            animationGroups = animationGroups.filter((a) => a.targetedAnimations.find((t) => t.target === this.props.node));
        }

        if (filter) {
            animationGroups = animationGroups.filter((a) => a.name.toLowerCase().indexOf(filter) !== -1);
        }

        return animationGroups.map((a, index) => ({
            nodeData: a,
            label: a.name,
            id: `${a.name}_${index}`,
            childNodes: a.targetedAnimations.map((t, index) => ({
                id: index,
                nodeData: t,
                label: (
                    <div style={{ width: "100%" }}>
                        <div style={{ width: "calc(50% - 10px)", float: "left" }}>
                            {t.target ? (t.target.name ?? "Unnamed target") : "Undefined target"}
                        </div>
                        <div style={{ width: "20px", float: "left" }}>
                            <BPIcon icon="arrow-right" />
                        </div>
                        <div style={{ width: "calc(50% - 10px)", float: "left" }}>
                            {t.animation.name ?? "Unnamed animation"}
                        </div>
                    </div>
                )
            })),
        }));
    }

    /**
     * Called on the user clicks on a node in the tree.
     */
    private _handleNodeClicked(node: ITreeNode<AnimationGroup | TargetedAnimation>): void {
        this.state.nodes.forEach((n) => {
            n.isSelected = false;
            n.childNodes?.forEach((c) => c.isSelected = false);
        });

        node.isSelected = true;

        this.setState({ nodes: this.state.nodes, selectedNode: node });
    }

    /**
     * Called on the user expands or collapses a node in the tree.
     */
    private _handleNodeExpand(node: ITreeNode<AnimationGroup | TargetedAnimation>, isExpanded: boolean): void {
        node.isExpanded = isExpanded;
        this.setState({ nodes: this.state.nodes });
    }

    /**
     * Called on the user wants to import animations from another file.
     */
    private async _handleImportAnimationGroupsFromFile(): Promise<void> {
        const file = await Tools.ShowOpenFileDialog("Open File To Merge Animations");
        if (!file) {
            return;
        }

        const rootUrl = join(dirname(file), "/");
        const filename = basename(file);

        await SceneLoader.ImportAnimationsAsync(rootUrl, filename, this.props.scene, false, SceneLoaderAnimationGroupLoadingMode.Sync);

        this.setState({ nodes: this._getAnimationGroupsItems() });
    }

    /**
     * Called on the user right-clicks on a node in the tree.
     */
    private _handleNodeContextMenu(node: ITreeNode<AnimationGroup | TargetedAnimation>, ev: React.MouseEvent<HTMLElement, MouseEvent>): void {
        const data = node.nodeData;
        if (!data || !(data instanceof AnimationGroup)) {
            return;
        }

        this._handleNodeClicked(node);

        ContextMenu.show((
            <Menu>
                <MenuItem text="Copy Name" icon="clipboard" onClick={() => clipboard.writeText(data.name, "clipboard")} />
                <MenuDivider />
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => {
                    undoRedo.push({
                        description: `Removed animation group named "${data.name ?? "Unnamed"}"`,
                        common: () => {
                            this.setState({ nodes: this._getAnimationGroupsItems() });
                        },
                        undo: () => {
                            this.props.scene.animationGroups.push(data);
                        },
                        redo: () => {
                            const index = this.props.scene.animationGroups.indexOf(data);
                            if (index !== -1) {
                                this.props.scene.animationGroups.splice(index, 1);
                            }
                        },
                    });
                }} />
            </Menu>
        ), {
            left: ev.clientX,
            top: ev.clientY,
        });
    }
}

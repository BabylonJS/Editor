import { join } from "path";
import { pathExists } from "fs-extra";

import { Nullable } from "../../../../../shared/types";

import * as React from "react";
import { Classes, ContextMenu, Menu, MenuItem, Tree, TreeNodeInfo } from "@blueprintjs/core";

import { Camera, PostProcess } from "babylonjs";

import { IExportedInspectorValue, SandboxMain } from "../../../../sandbox/main";

import { Icon } from "../../../gui/icon";
import { Alert } from "../../../gui/alert";
import { Dialog } from "../../../gui/dialog";
import { Confirm } from "../../../gui/confirm";

import { PostProcessAssets } from "../../../scene/post-processes";

import { InspectorList } from "../../../gui/inspector/fields/list";
import { InspectorColor } from "../../../gui/inspector/fields/color";
import { InspectorButton } from "../../../gui/inspector/fields/button";
import { InspectorNumber } from "../../../gui/inspector/fields/number";
import { InspectorSection } from "../../../gui/inspector/fields/section";
import { InspectorVector2 } from "../../../gui/inspector/fields/vector2";
import { InspectorVector3 } from "../../../gui/inspector/fields/vector3";
import { InspectorVector4 } from "../../../gui/inspector/fields/vector4";

import { Tools } from "../../../tools/tools";
import { AppTools } from "../../../tools/app";
import { undoRedo } from "../../../tools/undo-redo";
import { checkExportedProperties, resetExportedPropertiesToDefaultValue } from "../tools/properties-checker";

import { WorkSpace } from "../../../project/workspace";
import { SceneExporter } from "../../../project/scene-exporter";

import { AbstractInspector } from "../abstract-inspector";
import { Inspector, IObjectInspectorProps } from "../../inspector";

export interface IPostProcessesInspectorState {
    /**
     * Defines the list of all available post-process in the tree view.s
     */
    nodes: TreeNodeInfo<PostProcess>[];
    /**
     * Defines the reference to the selected node in the tree view.
     */
    selectedNode?: TreeNodeInfo<PostProcess>;
}

export class PostProcessesInspector extends AbstractInspector<Camera, IPostProcessesInspectorState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.state = {
            ...this.state,
            nodes: this._getPostProcesses(),
        };
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                <InspectorSection title="Post-Processes">
                    <div style={{ backgroundColor: "#333333", minHeight: "200px" }}>
                        <Tree
                            contents={this.state.nodes}
                            onNodeClick={(n) => this._handleNodeClick(n)}
                            onNodeContextMenu={(n, _, e) => this._handleNodeContextMenu(n, e)}
                        />
                    </div>
                    <InspectorButton label="Add..." onClick={() => this._handleAddButtonClicked()} />
                </InspectorSection>
                {this._getSelectedPostProcessInspector()}
            </>
        );
    }

    /**
     * Called on the component did mount
     */
    public componentDidMount(): void {
        super.componentDidMount();
        if (this.state.nodes.length) {
            this._handleNodeClick(this.state.nodes[0]);
        }
    }

    /**
     * Returns the list of all nodes drawn in the post-process tree view.
     */
    private _getPostProcesses(): TreeNodeInfo<PostProcess>[] {
        const result: TreeNodeInfo<PostProcess>[] = [];

        this.editor.scene?.postProcesses.forEach((p, i) => {
            if (PostProcessAssets.IsReservedPostProcess(p)) {
                return;
            }

            result.push({
                id: i,
                nodeData: p,
                label: p.name,
            });
        });

        return result;
    }

    /**
     * Called on the user clicks on a node.
     */
    private _handleNodeClick(node: TreeNodeInfo<PostProcess>): void {
        this.state.nodes.forEach((n) => n.isSelected = false);
        node.isSelected = true;

        this.setState({
            selectedNode: node,
            nodes: this.state.nodes,
        });
    }

    /**
     * Called on the user right-clicks an item in the tree view.
     */
    private _handleNodeContextMenu(node: TreeNodeInfo<PostProcess>, event: React.MouseEvent<HTMLElement, MouseEvent>): void {
        ContextMenu.show((
            <Menu>
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => this._handleRemovePostProcess(node)} />
            </Menu>
        ), {
            top: event.clientY,
            left: event.clientX,
        });
    }

    private _getSelectedPostProcessInspector(): React.ReactNode {
        const pp = this.state.selectedNode?.nodeData;
        if (!pp) {
            return undefined;
        }

        // Get inspectable values
        const inspectableValues = (pp.constructor as any)._InspectorValues as IExportedInspectorValue[];
        if (!inspectableValues?.length) {
            return;
        }

        checkExportedProperties(inspectableValues, pp);

        // Fill from inspector
        const children: React.ReactNode[] = [];

        inspectableValues.forEach((v) => {
            switch (v.type) {
                case "number": children.push(<InspectorNumber object={pp} property={v.propertyKey} label={v.name} min={v.options?.min} max={v.options?.max} step={v.options?.step} />); break;
                case "Vector2": children.push(<InspectorVector2 object={pp} property={v.propertyKey} label={v.name} min={v.options?.min} max={v.options?.max} step={v.options?.step} />); break;
                case "Vector3": children.push(<InspectorVector3 object={pp} property={v.propertyKey} label={v.name} min={v.options?.min} max={v.options?.max} step={v.options?.step} />); break;
                case "Vector4": children.push(<InspectorVector4 object={pp} property={v.propertyKey} label={v.name} min={v.options?.min} max={v.options?.max} step={v.options?.step} />); break;

                case "Texture": children.push(<InspectorList object={pp} property={v.propertyKey} label={v.name} items={() => this.getTexturesList()} dndHandledTypes={["asset/texture"]} />); break;

                case "Color3":
                case "Color4":
                    children.push(<InspectorColor object={pp} property={v.propertyKey} label={v.name} step={v.options?.step} />);
                    break;
            }
        });

        return (
            <InspectorSection title="Parameters">
                {children}
                <InspectorButton label="Reset Defaults..." small onClick={() => this._handleResetInspectableValuesToDefault(inspectableValues, pp)} />
            </InspectorSection>
        );
    }

    /**
     * Called on the user wants to reset the inspectable properties to their default value.
     */
    private async _handleResetInspectableValuesToDefault(inspectableValues: any, pp: PostProcess): Promise<void> {
        const confirm = await Confirm.Show("Reset all to default values", "Are you sure to reset all inspectable properties to the default values provided in decorators?");
        if (!confirm) {
            return;
        }

        if (inspectableValues) {
            resetExportedPropertiesToDefaultValue(inspectableValues, pp, () => {
                this.editor.inspector.refresh();
            });
        }
    }

    /**
     * Called on the user clicks on the "Add..." button.
     */
    private async _handleAddButtonClicked(): Promise<void> {
        const sourcesDirectory = this.editor.assetsBrowser._files?._sourcesDirectory;
        if (!sourcesDirectory) {
            return;
        }

        let path = join(await AppTools.ShowOpenFileDialog("Post-Process Source Code", sourcesDirectory));

        if (path.indexOf(sourcesDirectory) !== 0) {
            return Alert.Show("Failed To Create Post_process", `Selected source code is not part of the current workspace.\n${path}`);
        }

        const relativePath = path.replace(join(WorkSpace.DirPath!, "/"), "");
        const jsPath = Tools.GetSourcePath(WorkSpace.DirPath!, relativePath);

        // show toaster that waits for the JS file to exist.
        let cancelWait = false;
        let toasterId: Nullable<string> = null;

        while (!(await pathExists(jsPath)) && !cancelWait) {
            toasterId ??= this.props.editor._toaster?.show({
                timeout: -1,
                intent: "primary",
                className: Classes.DARK,
                message: "Waiting for compiled JS file...",
                action: {
                    text: "Cancel",
                    onClick: () => cancelWait = true,
                },
            }) ?? null;

            await Tools.Wait(500);
        }

        if (toasterId) {
            this.props.editor._toaster?.dismiss(toasterId);
        }

        if (cancelWait) {
            return;
        }

        await SceneExporter.CopyShaderFiles(this.props.editor);

        const ctors = await SandboxMain.GetConstructorsList(jsPath);
        if (ctors.indexOf("PostProcess") === -1) {
            return Alert.Show("Failed To Create Post-Process", "The selected source code doesn't export any post-process class as default export.");
        }

        // Instantiate
        const exports = require(jsPath);
        const pp = new exports.default(this.editor.scene, this.selectedObject) as PostProcess;

        this.editor.scene!.cameras.forEach((c) => {
            const index = c._postProcesses.indexOf(pp);
            if (index === -1) {
                c.attachPostProcess(pp);
            }
        });

        // Configure
        try {
            const name = await Dialog.Show("Post-Process Name", "Please provide a name for the new post-process to create.");
            pp.name = name;
        } catch (e) {
            // Catch silently.
        }

        // Register
        this.editor.postProcesses.addPostProcess(relativePath, pp);
        this.editor.postProcesses.reset();

        // Update
        const nodes = this._getPostProcesses();

        this.setState({ nodes }, () => {
            this._handleNodeClick(nodes[nodes.length - 1]);
        });
    }

    /**
     * Called on the user wants to remove a post-process.
     */
    private _handleRemovePostProcess(node: TreeNodeInfo<PostProcess>): void {
        const pp = node.nodeData;
        if (!pp) {
            return;
        }

        const positions = this.editor.scene!.cameras.map((camera) => ({
            camera,
            index: camera._postProcesses.indexOf(pp),
        }));

        undoRedo.push({
            common: () => {
                this.editor.inspector.refresh();
                this.editor.postProcesses.reset();
            },
            undo: () => {
                this.editor.scene!.postProcesses.push(pp);
                positions.forEach((p) => {
                    p.camera.attachPostProcess(pp, p.index === -1 ? undefined : p.index);
                });
            },
            redo: () => {
                const index = this.editor.scene!.postProcesses.indexOf(pp);
                if (index !== -1) {
                    this.editor.scene!.postProcesses.splice(index, 1);
                }

                this.editor.scene!.cameras.forEach((c) => {
                    c.detachPostProcess(pp);
                });
            },
        });
    }
}

Inspector.RegisterObjectInspector({
    ctor: PostProcessesInspector,
    title: "Post-Processes",
    ctorNames: ["ArcRotateCamera", "TargetCamera", "FreeCamera", "UniversalCamera", "EditorCamera"],
});

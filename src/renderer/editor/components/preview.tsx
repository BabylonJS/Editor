import { Nullable, Undefinable } from "../../../shared/types";

import * as React from "react";
import { Position, ButtonGroup, Popover, Button, Menu, MenuItem, Divider, Tag, Tooltip } from "@blueprintjs/core";

import { Node, TargetCamera, Vector3, Animation, Light, Mesh, Camera, InstancedMesh, IParticleSystem, ParticleSystem, AbstractMesh, Sound, Observable } from "babylonjs";

import { Editor } from "../editor";

import { ScenePicker } from "../scene/picker";
import { SceneGizmo, GizmoType } from "../scene/gizmo";
import { SceneSettings } from "../scene/settings";

import { Tools } from "../tools/tools";

import { Icon } from "../gui/icon";
import { Omnibar, IOmnibarItem } from "../gui/omni-bar";

import { WorkSpace } from "../project/workspace";
import { ProjectExporter } from "../project/project-exporter";

export interface IPreviewProps {
    /**
     * The editor reference.
     */
    editor: Editor;
}

export interface IPreviewState {
    /**
     * Wether or not the canvas is focused or not.
     */
    canvasFocused: boolean;
    /**
     * The name of the node which is under the pointer.
     */
    overNodeName: string;
    /**
     * The current type of gizmo used in the preview.
     */
    gizmoType: GizmoType;
    /**
     * Defines the current used while using the gizmos.
     */
    gizmoStep: number;
    /**
     * Defines the list of all available gizmo steps.
     */
    availableGizmoSteps: number[];
    /**
     * Defines wether or not force wireframe is enabled or not.
     */
    forceWireframe: boolean;
    /**
     * Defines wether or not the icons should be drawn.
     */
    showIcons: boolean;
}

export enum PreviewCanvasEventType {
    /**
     * Defines the event raised when the preview canvas is focused.
     */
    Focused = 0,
    /**
     * Defines the vent raised when the preview canvas is blurred.
     */
    Blurred
}

export class Preview extends React.Component<IPreviewProps, IPreviewState> {
    /**
     * Defines the scene picker used to get/pick infos from the scene.
     */
    public picker: ScenePicker;
    /**
     * Defines the scene gizmo manager.
     */
    public gizmo: SceneGizmo;
    /**
     * Notifies observers that an event happened on the canvas.
     */
    public onCanvasEventObservable: Observable<PreviewCanvasEventType> = new Observable<PreviewCanvasEventType>();

    private _editor: Editor;
    private _copiedNode: Nullable<Node | IParticleSystem> = null;

    private _searchBar: Omnibar;
    private _refHandler = {
        getSearchBar: (ref: Omnibar) => this._searchBar = ref,
    };

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IPreviewProps) {
        super(props);

        this._editor = props.editor;

        this._editor.preview = this;
        this._editor.editorInitializedObservable.addOnce(() => this._createPicker());

        this.state = {
            canvasFocused: false,
            overNodeName: "",
            gizmoType: GizmoType.None,
            gizmoStep: 0,
            availableGizmoSteps: [0, 1, 2, 5, 10],
            forceWireframe: false,
            showIcons: true,
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const cameras = (
            <Menu>
                {this._editor.scene?.cameras.map((c) => (
                    <MenuItem key={c.id} id={c.id} text={c.name} icon={<Icon src="camera.svg" />} onClick={() => SceneSettings.SetActiveCamera(this._editor, c)} />
                ))}
            </Menu>
        );

        const isNone = this.state.gizmoType === GizmoType.None;
        const isPosition = this.state.gizmoType === GizmoType.Position;
        const isRotation = this.state.gizmoType === GizmoType.Rotation;
        const isScaling = this.state.gizmoType === GizmoType.Scaling;

        const steps = (
            <Menu>
                {this.state.availableGizmoSteps.map((s) => (
                    <MenuItem key={s.toString()} text={s.toString()} icon={this._getCheckedIcon(this.state.gizmoStep === s)} onClick={() => this.setGizmoStep(s)} />
                ))}
            </Menu>
        );

        return (
            <>
                <div id="preview-toolbar" style={{ width: "100%", height: "25px" }}>
                    <ButtonGroup key="preview-buttons" large={false} style={{ height: "20px", marginTop: "auto", marginBottom: "auto" }}>
                        <Popover key="cameras-popover" content={cameras} position={Position.BOTTOM_LEFT}>
                            <Button key="cameras-button" small={true} icon={<Icon src="camera.svg" />} rightIcon="caret-down" text="Cameras"/>
                        </Popover>

                        <Divider />

                        <Tooltip content="Hide Gizmo" position={Position.BOTTOM}>
                            <Button key="gizmo-none" small={true} active={isNone} disabled={isNone} text="None" onClick={() => this.setGizmoType(GizmoType.None)} />
                        </Tooltip>

                        <Tooltip content="Position" position={Position.BOTTOM}>
                            <Button key="gizmo-position" small={true} active={isPosition} disabled={isPosition} icon={<Icon src="arrows-alt.svg" />} onClick={() => this.setGizmoType(GizmoType.Position)} />
                        </Tooltip>

                        <Tooltip content="Rotation" position={Position.BOTTOM}>
                            <Button key="gizmo-rotation" small={true} active={isRotation} disabled={isRotation} icon={<Icon src="crosshairs.svg" />} onClick={() => this.setGizmoType(GizmoType.Rotation)} />
                        </Tooltip>

                        <Tooltip content="Scaling" position={Position.BOTTOM}>
                            <Button key="gizmo-scaling" small={true} active={isScaling} disabled={isScaling} icon={<Icon src="arrows-alt-v.svg" />} onClick={() => this.setGizmoType(GizmoType.Scaling)} />
                        </Tooltip>

                        <Popover content={steps} position={Position.BOTTOM_LEFT}>
                            <Button key="step1" small={true} rightIcon="caret-down" text={`Steps (${this.state.gizmoStep})`} />
                        </Popover>

                        <Divider />

                        <Tooltip content="Wireframe" position={Position.BOTTOM}>
                            <Button key="wireframe" small={true} icon={<Icon src="grip-lines.svg" style={{ opacity: (this.state.forceWireframe ? 1 : 0.5) }} />} onClick={() => this.toggleWireframe()} />
                        </Tooltip>

                        <Tooltip content="Show Icons" position={Position.BOTTOM}>
                            <Button key="icons" small={true} icon={<Icon src="eye.svg" style={{ opacity: (this.state.showIcons ? 1 : 0.5) }} />} onClick={() => this.toggleShowIcons()} />
                        </Tooltip>
                    </ButtonGroup>
                </div>
                <div style={{ height: "calc(100% - 25px)" }}>
                    <canvas id="renderCanvas" style={{ width: "100%", height: "100%", position: "unset", top: "0", touchAction: "none" }}></canvas>
                    <Tag key="preview-tag" round={true} large={true} style={{ visibility: (this.state.canvasFocused ? "visible" : "hidden"), position: "absolute", left: "50%", top: "calc(100% - 15px)", transform: "translate(-50%, -50%)" }} >{this.state.overNodeName}</Tag>
                    <Omnibar ref={this._refHandler.getSearchBar} onChange={(i) => this._handleSearchBarChanged(i)} />
                </div>
            </>
        );
    }

    /**
     * Sets the new gizmo type to be used in the preview.
     * If the given gizmo type is the same as the current, it just sets the current type as "None".
     * @param gizmoType the new type of gizmo to be used in the preview.
     */
    public setGizmoType(gizmoType: GizmoType): void {
        if (this.state.gizmoType === gizmoType) { gizmoType = GizmoType.None; }

        this.gizmo.gizmoType = gizmoType;
        this.setState({ gizmoType });
    }

    /**
     * Sets the current step used while using the gizmos.
     * @param gizmoStep the new step to use when using the current gizmo.
     */
    public setGizmoStep(gizmoStep: number): void {
        this.gizmo.gizmoStep = gizmoStep;
        this.setState({ gizmoStep });
    }

    /**
     * Toggles the force wireframe boolean for the current scene.
     */
    public toggleWireframe(): void {
        this._editor.scene!.forceWireframe = !this._editor.scene!.forceWireframe;
        this.setState({ forceWireframe: this._editor.scene!.forceWireframe });
    }

    /**
     * Togglets the scene icons for the current scene.
     */
    public toggleShowIcons(): void {
        this.picker.icons.enabled = !this.picker.icons.enabled;
        this.setState({ showIcons: this.picker.icons.enabled });
    }

    /**
     * Returns wether or not the canvas is focused.
     */
    public get canvasFocused(): boolean {
        return this.state.canvasFocused;
    }

    /**
     * Shows the search bar.
     */
    public showSearchBar(): void {
        this._searchBar.show([
                { id: "__editor__separator__", name: "Scene Nodes" }
            ].concat(this._editor.sceneUtils.getAllNodes()).concat([
                { id: "__editor__separator__", name: "Commands" },
                { id: "__command__build__project__", name: "Build Project..." },
                { id: "__command__generate_scene__", name: "Generate Scene..." },
        ]));
    }

    /**
     * Focuses the currently selected node.
     */
    public focusSelectedNode(): void {
        this._focusNode(this._editor.graph.lastSelectedObject);
    }

    /**
     * Copies the currently selected node.
     */
    public copySelectedNode(): void {
        const object = this._editor.graph.lastSelectedObject;
        if (!(object instanceof Sound)) {
            this._copiedNode = object;
        }
    }

    /**
     * Pastes the latest copied node.
     */
    public pasteCopiedNode(): void {
        if (!this._copiedNode) { return; }

        let clone: Nullable<Node | IParticleSystem> = null;

        if (this._copiedNode instanceof Light) {
            clone = this._copiedNode.clone(this._copiedNode.name);
        } else if (this._copiedNode instanceof Camera) {
            clone = this._copiedNode.clone(this._copiedNode.name);
        } else if (this._copiedNode instanceof Mesh) {
            const instance = clone = this._copiedNode.createInstance(`${this._copiedNode.name} (Mesh Instance)`);
            instance.position.copyFrom(this._copiedNode.position);
            instance.rotation.copyFrom(this._copiedNode.rotation);
            if (this._copiedNode.rotationQuaternion) {
                instance.rotationQuaternion = this._copiedNode.rotationQuaternion.clone();
            }
            instance.scaling.copyFrom(this._copiedNode.scaling);
        } else if (this._copiedNode instanceof InstancedMesh) {
            const instance = clone = this._copiedNode.sourceMesh.createInstance(`${this._copiedNode.sourceMesh.name} (Mesh Instance)`);
            instance.position.copyFrom(this._copiedNode.position);
            instance.rotation.copyFrom(this._copiedNode.rotation);
            if (this._copiedNode.rotationQuaternion) {
                instance.rotationQuaternion = this._copiedNode.rotationQuaternion.clone();
            }
            instance.scaling.copyFrom(this._copiedNode.scaling);
        } else if (this._copiedNode instanceof ParticleSystem) {
            clone = this._copiedNode.clone(this._copiedNode.name, this._copiedNode.emitter);
        }

        if (clone) {
            if (clone instanceof Node && this._copiedNode instanceof Node) {
                clone.parent = this._copiedNode.parent;
            }

            clone.id = Tools.RandomId();

            if (clone instanceof Node) {
                this._editor.addedNodeObservable.notifyObservers(clone);
            } else {
                this._editor.addedParticleSystemObservable.notifyObservers(clone);
            }

            this._editor.graph.refresh(() => {
                if (clone instanceof Node) {
                    this._editor.selectedNodeObservable.notifyObservers(clone);
                } else {
                    this._editor.selectedParticleSystemObservable.notifyObservers(clone!);
                }
            });
        }
    }

    /**
     * Removes the currently selected node.
     */
    public removeSelectedNode(): void {
        const node = this._editor.graph.lastSelectedObject;
        if (!node) { return; }

        this._editor.graph.removeObject(node);
    }

    /**
     * Returns the check icon if the given "checked" property is true.
     */
    private _getCheckedIcon(checked: Undefinable<boolean>): Undefinable<JSX.Element> {
        return checked ? <Icon src="check.svg" /> : undefined;
    }

    /**
     * Creates the scene picker.
     */
    private _createPicker(): void {
        this.picker = new ScenePicker(this._editor);
        this.picker.onNodeOver.add((n) => {
            this.setState({ overNodeName: n.name });
        });

        this.gizmo = new SceneGizmo(this._editor);

        this._bindEvents();
    }

    /**
     * Focuses on the given node.
     */
    private _focusNode(node: Nullable<Node | IParticleSystem | Sound>): void {
        if (!node) { return; }

        if (node instanceof ParticleSystem) { node = node.emitter as AbstractMesh; }

        const camera = this._editor.scene!.activeCamera;
        if (!camera || !(camera instanceof TargetCamera)) { return; }

        const translation = Vector3.Zero();
        (node as Node).getWorldMatrix().decompose(undefined, undefined, translation);
        
        if (camera["target"]) {
            const a = new Animation("FocusTargetAnimation", "target", 60, Animation.ANIMATIONTYPE_VECTOR3);
            a.setKeys([{ frame: 0, value: camera.getTarget() }, { frame: 60, value: translation }]);

            this._editor.scene!.stopAnimation(camera);
            this._editor.scene!.beginDirectAnimation(camera, [a], 0, 60, false, 4);
        } else {
            camera.setTarget(translation);
        }
    }

    /**
     * Called on the user selects an item in the searchbar
     */
    private async _handleSearchBarChanged(item: Nullable<IOmnibarItem>): Promise<void> {
        if (!item) { return; }

        switch (item.id) {
            case "__command__build__project__": return WorkSpace.BuildProject(this._editor);
            case "__command__generate_scene__": return ProjectExporter.ExportFinalScene(this._editor);
        }

        const node = this._editor.scene!.getNodeByID(item.id);
        if (!node) { return; }

        this._focusNode(node);
    }

    /**
     * Binds the events.
     */
    private _bindEvents(): void {
        const canvas = this._editor.engine!.getRenderingCanvas();
        if (!canvas) { return; }

        canvas.addEventListener("mouseenter", () => {
            this.setState({ canvasFocused: true });
            this.onCanvasEventObservable.notifyObservers(PreviewCanvasEventType.Focused);
        });
        canvas.addEventListener("mouseleave", () => {
            this.setState({ canvasFocused: false });
            this.picker?.canvasBlur();
            this.onCanvasEventObservable.notifyObservers(PreviewCanvasEventType.Blurred);
        });
    }
}

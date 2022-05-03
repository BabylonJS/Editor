import { join } from "path";

import { Nullable, Undefinable } from "../../../shared/types";

import * as React from "react";
import { Position, ButtonGroup, Popover, Menu, MenuItem, Divider, Tag, Tooltip, Pre, AnchorButton, ProgressBar } from "@blueprintjs/core";

import {
    Node, TargetCamera, Vector3, Animation, Camera, IParticleSystem, ParticleSystem, AbstractMesh, Sound, Observable,
} from "babylonjs";

import { Editor } from "../editor";

import { ScenePicker } from "../scene/picker";
import { SceneSettings } from "../scene/settings";
import { SceneGizmo, GizmoType } from "../scene/gizmo";

import { Tools } from "../tools/tools";

import { Icon } from "../gui/icon";
import { Omnibar, IOmnibarItem } from "../gui/omni-bar";

import { WorkSpace } from "../project/workspace";
import { SceneExporter } from "../project/scene-exporter";

import { ScenePlayer } from "../../play/inline-play";

import { PreviewCopyHelper } from "./preview/copy";

export enum PreviewFocusMode {
    Target = 1,
    Position = 1 << 1,
    Bottom = 1 << 2,
    Top = 1 << 3,
    Left = 1 << 4,
    Right = 1 << 5,
    Front = 1 << 6,
    Back = 1 << 7,
}

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
    /**
     * Defines wether or not the preview is in isolated mode.
     */
    isIsolatedMode: boolean;

    /**
     * Defines wether or not the user is playing the scene.
     */
    isPlaying: boolean;
    /**
     * Defines wether or not the user is playing the scene in a dedicated iframe.
     */
    isPlayingInIframe: boolean;
    /**
     * Defines the current play loading progress.
     */
    playLoadingProgress: number;
}

export enum PreviewCanvasEventType {
    /**
     * Defines the event raised when the preview canvas is focused.
     */
    Focused = 0,
    /**
     * Defines the vent raised when the preview canvas is blurred.
     */
    Blurred,
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

    /**
     * @hidden
     */
    public _scenePlayer: ScenePlayer;

    private _editor: Editor;
    private _copiedNode: Nullable<Node | IParticleSystem> = null;

    private _isolatedObject: Nullable<AbstractMesh | IParticleSystem> = null;
    private _cameraPositionBeforeIsolation: Nullable<Vector3> = null;
    private _cameraTargetBeforeIsolation: Nullable<Vector3> = null;
    private _isolationBaseMeshesArray: Nullable<AbstractMesh[]> = null;

    private _searchBar: Omnibar;
    private _playIframe: HTMLIFrameElement;
    private _refHandler = {
        getSearchBar: (ref: Omnibar) => this._searchBar = ref,
        getPlayIframe: (ref: HTMLIFrameElement) => this._playIframe = ref,
    };

    private _playMessageEventListener: Nullable<(ev: MessageEvent) => void> = null;

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IPreviewProps) {
        super(props);

        this._editor = props.editor;

        this._editor.preview = this;
        this._editor.editorInitializedObservable.addOnce(() => this._createPicker());

        this._scenePlayer = new ScenePlayer(this._editor);

        this.state = {
            canvasFocused: false,
            overNodeName: "",
            gizmoType: GizmoType.None,
            gizmoStep: 0,
            availableGizmoSteps: [0, 1, 2, 5, 10],
            forceWireframe: false,
            showIcons: true,
            isIsolatedMode: false,
            isPlaying: false,
            isPlayingInIframe: false,
            playLoadingProgress: 1,
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const cameras = (
            <Menu>
                {this._editor.scene?.cameras.map((c) => (
                    <MenuItem key={c.id} id={c.id} text={c.name} icon={this._editor.scene?.activeCamera === c ? <Icon src="check.svg" /> : null} onClick={() => SceneSettings.SetActiveCamera(this._editor, c)} />
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

        const isolatedMode = this.state.isIsolatedMode ? (
            <Pre style={{ position: "absolute", top: "30px", left: "10px" }}>
                Focusing On: {this._isolatedObject?.name}
            </Pre>
        ) : undefined;

        const displayPlayIframe = this.state.isPlaying && this.state.isPlayingInIframe;
        const playIframe = displayPlayIframe ? (
            <iframe
                src="./play.html"
                key={Tools.RandomId()}
                ref={this._refHandler.getPlayIframe}
                onLoad={(ev) => this._handlePlay(ev.nativeEvent.target as HTMLIFrameElement)}
                style={{ width: "100%", height: "100%", position: "unset", top: "0", touchAction: "none", border: "none" }}
            ></iframe>
        ) : undefined;

        const loadingProgress = this.state.isPlaying && !this.state.isPlayingInIframe && this.state.playLoadingProgress < 1 ? (
            <ProgressBar animate value={this.state.playLoadingProgress * 100} />
        ) : undefined;

        return (
            <>
                <div id="preview-toolbar" style={{ width: "100%", height: "25px" }}>
                    <ButtonGroup key="preview-buttons" large={false} style={{ height: "20px", marginTop: "auto", marginBottom: "auto" }}>
                        <Popover key="cameras-popover" content={cameras} position={Position.BOTTOM_LEFT}>
                            <AnchorButton key="cameras-button" small={true} icon={<Icon src="camera.svg" />} rightIcon="caret-down" text="Cameras" />
                        </Popover>

                        <Divider />

                        <Tooltip content="Hide Gizmo" position={Position.BOTTOM}>
                            <AnchorButton key="gizmo-none" small={true} active={isNone} disabled={isNone} text="None" onClick={() => this.setGizmoType(GizmoType.None)} />
                        </Tooltip>

                        <Tooltip content="Position" position={Position.BOTTOM}>
                            <AnchorButton key="gizmo-position" small={true} active={isPosition} disabled={isPosition} icon={<Icon src="arrows-alt.svg" />} onClick={() => this.setGizmoType(GizmoType.Position)} />
                        </Tooltip>

                        <Tooltip content="Rotation" position={Position.BOTTOM}>
                            <AnchorButton key="gizmo-rotation" small={true} active={isRotation} disabled={isRotation} icon={<Icon src="crosshairs.svg" />} onClick={() => this.setGizmoType(GizmoType.Rotation)} />
                        </Tooltip>

                        <Tooltip content="Scaling" position={Position.BOTTOM}>
                            <AnchorButton key="gizmo-scaling" small={true} active={isScaling} disabled={isScaling} icon={<Icon src="arrows-alt-v.svg" />} onClick={() => this.setGizmoType(GizmoType.Scaling)} />
                        </Tooltip>

                        <Popover content={steps} position={Position.BOTTOM_LEFT}>
                            <AnchorButton key="step1" small={true} rightIcon="caret-down" text={`Steps (${this.state.gizmoStep})`} />
                        </Popover>

                        <Divider />

                        <Tooltip content="Wireframe" position={Position.BOTTOM}>
                            <AnchorButton key="wireframe" small={true} icon={<Icon src="grip-lines.svg" style={{ opacity: (this.state.forceWireframe ? 1 : 0.5) }} />} onClick={() => this.toggleWireframe()} />
                        </Tooltip>

                        <Tooltip content="Show Icons" position={Position.BOTTOM}>
                            <AnchorButton key="icons" small={true} icon={<Icon src="eye.svg" style={{ opacity: (this.state.showIcons ? 1 : 0.5) }} />} onClick={() => this.toggleShowIcons()} />
                        </Tooltip>
                    </ButtonGroup>
                </div>
                <div style={{ height: "calc(100% - 25px)" }}>
                    <canvas id="renderCanvas" style={{ width: "100%", height: "100%", position: "unset", top: "0", touchAction: "none", display: displayPlayIframe ? "none" : "block" }}></canvas>
                    {playIframe}
                    {isolatedMode}
                    <Tag key="preview-tag" round={true} large={true} style={{ visibility: (this.state.canvasFocused && !this.state.isPlaying ? "visible" : "hidden"), position: "absolute", left: "50%", top: "calc(100% - 15px)", transform: "translate(-50%, -50%)" }} >{this.state.overNodeName}</Tag>
                    <Omnibar ref={this._refHandler.getSearchBar} onChange={(i) => this._handleSearchBarChanged(i)} />
                    <div style={{ position: "absolute", top: "50%", left: "25%", width: "50%" }}>
                        {loadingProgress}
                    </div>
                </div>
            </>
        );
    }

    /**
     * Called on the user wants to play or stop the scene.
     * @param isPlayingInIframe defines wether or not the game is played in an isolated context using an iFrame.
     */
    public async playOrStop(isPlayingInIframe: boolean): Promise<void> {
        const isPlaying = !this.state.isPlaying;

        if (isPlaying) {
            await this.startPlayScene(isPlayingInIframe);
        } else {
            await this.stopPlayingScene(isPlayingInIframe);
        }
    }

    /**
     * Starts playing the scene in the editor.
     * @param isPlayingInIframe defines wether or not the game is played in an isolated context using an iFrame.
     * @throws
     */
    public async startPlayScene(isPlayingInIframe: boolean): Promise<void> {
        this._editor.runRenderLoop(false);

        if (!isPlayingInIframe) {
            this.setState({ isPlaying: true, isPlayingInIframe, playLoadingProgress: 0.5 });
        }

        await SceneExporter.ExportFinalScene(this._editor, undefined, {
            geometryRootPath: this.state.isPlayingInIframe ? undefined : join("../scenes", WorkSpace.GetProjectName(), "/"),
        });

        if (isPlayingInIframe) {
            return this.setState({ isPlaying: true, isPlayingInIframe });
        }

        this._editor.engine!.loadingScreen = {
            displayLoadingUI: () => { },
            hideLoadingUI: () => { },
            loadingUIText: "",
            loadingUIBackgroundColor: "",
        }

        try {
            await this._scenePlayer.start((p) => this.setState({ playLoadingProgress: p }));
        } catch (e) {
            await this.stopPlayingScene(isPlayingInIframe);

            this._editor.console.logSection("Failed to start playing scene");
            this._editor.console.logError(`An error happened: ${e.message}`);

            throw e;
        }
    }

    /**
     * Stops the game that is runnning in the editor.
     * @param isPlayingInIframe defines wether or not the game is played in an isolated context using an iFrame.
     */
    public async stopPlayingScene(isPlayingInIframe: boolean): Promise<void> {
        if (!this.state.isPlaying) {
            return;
        }

        if (this._playMessageEventListener) {
            window.removeEventListener("message", this._playMessageEventListener);
        }
        this._playMessageEventListener = null;

        if (!isPlayingInIframe) {
            this._scenePlayer.dispose();
        }

        this.setState({ isPlaying: false, playLoadingProgress: 1 });

        this._editor.runRenderLoop(true);
    }

    /**
     * In case the user is playing the test scene, it restarts the iframe.
     */
    public async restartPlay(): Promise<void> {
        if (this._playIframe) {
            this._playIframe.src = this._playIframe.src;
        } else {
            try {
                this._scenePlayer.dispose();
                await this._scenePlayer.start((p) => this.setState({ playLoadingProgress: p }));
            } catch (e) {
                this._editor.console.logError(`Failed to restart: ${e.message}`);
            }
        }
    }

    /**
     * Toggles the isolated mode.
     */
    public toggleIsolatedMode(object: Nullable<AbstractMesh | IParticleSystem> = null): void {
        const scene = this._editor.scene!;
        const camera = scene.activeCamera;

        if (!camera) { return; }

        if (this.state.isIsolatedMode) {
            scene.meshes = this._isolationBaseMeshesArray!.concat(scene.meshes.filter((m) => this._isolationBaseMeshesArray?.indexOf(m) === -1));

            this._isolatedObject = null;
            this._restoreCameraPositionBeforeIsolation(camera);
            this.setState({ isIsolatedMode: false });
        } else {
            if (!object) {
                object = this._editor.graph.lastSelectedObject as any;
            }

            if (!object || (!(object instanceof AbstractMesh) && !(object instanceof ParticleSystem))) { return; }

            this._isolatedObject = object;

            if (object instanceof AbstractMesh) {
                this._isolationBaseMeshesArray = scene.meshes;
                scene.meshes = [object];
            }

            this._cameraPositionBeforeIsolation = camera.position.clone();
            if (camera instanceof TargetCamera) {
                this._cameraTargetBeforeIsolation = camera.target.clone();
            }

            this._editor.inspector.setSelectedObject(object);
            this._focusNode(object, PreviewFocusMode.Position | PreviewFocusMode.Target, camera);
            this.setState({ isIsolatedMode: true });
        }
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
     * @param mode defines the focus mode (animate target, position, etc.).
     */
    public focusSelectedNode(mode: PreviewFocusMode): void {
        this._focusNode(this._editor.graph.lastSelectedObject, mode);
    }

    /**
     * Focuses the given node.
     * @param node defines the reference to the node to focus.
     * @param mode defines the focus mode (animate target, position, etc.).
     */
    public focusNode(node: Node | IParticleSystem | Sound, mode: PreviewFocusMode): void {
        this._focusNode(node, mode);
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
        if (!this._copiedNode) {
            return;
        }

        PreviewCopyHelper.CopyNode(this._editor, this._copiedNode);
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
    private _focusNode(node: Nullable<Node | IParticleSystem | Sound>, mode: PreviewFocusMode, camera?: Nullable<Camera>): void {
        if (!node) { return; }

        if (node instanceof ParticleSystem) { node = node.emitter as AbstractMesh; }
        if (node instanceof Sound) { node = node["_connectedTransformNode"]; }

        if (!node) { return; }

        if (!camera) {
            camera = this._editor.scene!.activeCamera;
        }

        if (!camera || !(camera instanceof TargetCamera)) { return; }

        this._editor.scene!.stopAnimation(camera);

        let translation = Vector3.Zero();

        const scaling = Vector3.Zero();
        (node as Node).getWorldMatrix().decompose(scaling, undefined, translation);

        if (node instanceof AbstractMesh) {
            node.refreshBoundingInfo(true);
            translation = node.getBoundingInfo()?.boundingBox?.centerWorld?.clone() ?? translation;
        }

        if (camera["target"]) {
            const a = new Animation("FocusTargetAnimation", "target", 60, Animation.ANIMATIONTYPE_VECTOR3);
            a.setKeys([{ frame: 0, value: camera.getTarget() }, { frame: 60, value: translation }]);

            this._editor.scene!.beginDirectAnimation(camera, [a], 0, 60, false, 3);
        } else {
            camera.setTarget(translation);
        }

        if (node instanceof AbstractMesh && node._boundingInfo) {
            const distance = (mode & PreviewFocusMode.Position) ?
                Vector3.Distance(node._boundingInfo.minimum.multiply(scaling), node._boundingInfo.maximum.multiply(scaling)) :
                Vector3.Distance(node.getAbsolutePosition(), camera.globalPosition);

            const startFrame = { frame: 0, value: camera.position.clone() };
            const a = new Animation("FocusPositionAnimation", "position", 60, Animation.ANIMATIONTYPE_VECTOR3);

            if (mode & PreviewFocusMode.Position) {
                a.setKeys([startFrame, { frame: 60, value: translation.add(new Vector3(distance, distance, distance)) }]);
            } else if (mode & PreviewFocusMode.Bottom) {
                a.setKeys([startFrame, { frame: 60, value: translation.add(new Vector3(0, -distance, 0)) }]);
            } else if (mode & PreviewFocusMode.Top) {
                a.setKeys([startFrame, { frame: 60, value: translation.add(new Vector3(0, distance, 0)) }]);
            } else if (mode & PreviewFocusMode.Left) {
                a.setKeys([startFrame, { frame: 60, value: translation.add(new Vector3(-distance, 0, 0)) }]);
            } else if (mode & PreviewFocusMode.Right) {
                a.setKeys([startFrame, { frame: 60, value: translation.add(new Vector3(distance, 0, 0)) }]);
            } else if (mode & PreviewFocusMode.Back) {
                a.setKeys([startFrame, { frame: 60, value: translation.add(new Vector3(0, 0, distance)) }]);
            } else if (mode & PreviewFocusMode.Front) {
                a.setKeys([startFrame, { frame: 60, value: translation.add(new Vector3(0, 0, -distance)) }]);
            } else {
                return;
            }

            this._editor.scene!.beginDirectAnimation(camera, [a], 0, 60, false, 3);
        }
    }

    /**
     * Restores the camera's position before the isolation.
     */
    private _restoreCameraPositionBeforeIsolation(camera: Camera): void {
        if (!this._cameraPositionBeforeIsolation) { return; }

        const positionAnimation = new Animation("RestorePositionAnimation", "position", 60, Animation.ANIMATIONTYPE_VECTOR3);
        positionAnimation.setKeys([{ frame: 0, value: camera.position.clone() }, { frame: 60, value: this._cameraPositionBeforeIsolation.clone() }]);

        this._cameraPositionBeforeIsolation = null;

        const animations = [positionAnimation];

        if (camera instanceof TargetCamera && this._cameraTargetBeforeIsolation) {
            const targetAnimation = new Animation("RestoreTargetAnimation", "target", 60, Animation.ANIMATIONTYPE_VECTOR3);
            targetAnimation.setKeys([{ frame: 0, value: camera.getTarget() }, { frame: 60, value: this._cameraTargetBeforeIsolation.clone() }]);

            animations.push(targetAnimation);

            this._cameraTargetBeforeIsolation = null;
        }

        this._editor.scene!.beginDirectAnimation(camera, animations, 0, 60, false, 3);
    }

    /**
     * Called on the user selects an item in the searchbar
     */
    private async _handleSearchBarChanged(item: Nullable<IOmnibarItem>): Promise<void> {
        if (!item) { return; }

        switch (item.id) {
            case "__command__build__project__": return WorkSpace.BuildProject(this._editor);
            case "__command__generate_scene__": return SceneExporter.ExportFinalScene(this._editor);
        }

        const node = this._editor.scene!.getNodeByID(item.id);
        if (!node) { return; }

        // this._focusNode(node, false);
        this._editor.selectedNodeObservable.notifyObservers(node);
    }

    /**
     * Called on the play iframe has been loaded.
     */
    private _handlePlay(ref: HTMLIFrameElement): void {
        ref.contentWindow?.postMessage({
            id: "init",
            workspaceDir: WorkSpace.DirPath!,
            projectName: WorkSpace.GetProjectName(),
            physicsEngine: WorkSpace.Workspace!.physicsEngine,
        }, undefined!);

        window.addEventListener("message", this._playMessageEventListener = (ev) => {
            if (ev.data?.error) {
                this._editor.notifyMessage(ev.data.error, 5000, "notifications", "danger");

                window.removeEventListener("message", this._playMessageEventListener!);
                this._playMessageEventListener = null;
            }
        });
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

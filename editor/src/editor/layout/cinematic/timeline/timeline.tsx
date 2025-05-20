import { Component, MouseEvent, ReactNode } from "react";

import { Animation, AnimationGroup, HavokPlugin, Node, Vector3 } from "babylonjs";

import { Editor } from "../../../main";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { isAbstractMesh } from "../../../../tools/guards/nodes";
import { waitNextAnimationFrame } from "../../../../tools/tools";
import { isDomElementDescendantOf } from "../../../../tools/dom";
import { updateLightShadowMapRefreshRate } from "../../../../tools/light/shadows";

import { isCinematicKeyCut } from "../schema/guards";
import { ICinematic, ICinematicKey, ICinematicKeyCut, ICinematicTrack } from "../schema/typings";

import { generateCinematicAnimationGroup } from "../generate/generate";

import { CinematicEditor } from "../editor";

import { CinematicEditorTracker } from "./tracker";
import { CinematicEditorTimelineItem } from "./track";

export interface ICinematicEditorTimelinePanelProps {
    editor: Editor;
    cinematic: ICinematic;
    cinematicEditor: CinematicEditor;
}

export interface ICinematicEditorTimelinePanelState {
    scale: number;
    moving: boolean;
    currentTime: number;
}

export class CinematicEditorTimelinePanel extends Component<ICinematicEditorTimelinePanelProps, ICinematicEditorTimelinePanelState> {
    /**
     * Defines the list of all available track items in the timeline.
    */
    public tracks: (CinematicEditorTimelineItem | null)[] = [];

    private _animation!: Animation;
    private _animatedCurrentTime: number = 0;
    private _renderLoop: (() => void) | null = null;

    private _generateAnimationGroup: AnimationGroup | null = null;
    private _temporaryAnimationGroup: AnimationGroup | null = null;

    private _divRef: HTMLDivElement | null = null;

    private _sceneState: Map<Node, any> = new Map();

    public constructor(props: ICinematicEditorTimelinePanelProps) {
        super(props);

        this.state = {
            scale: 1,
            moving: false,
            currentTime: 0,
        };
    }

    public render(): ReactNode {
        const width = this._getMaxWidthForTimeline();

        this.tracks.splice(0, this.tracks.length);
        this.tracks.length = this.props.cinematic.tracks.length;

        return (
            <div
                ref={(r) => this._divRef = r}
                onWheel={(ev) => this._onWheelEvent(ev)}
                onMouseDown={(ev) => this._handlePointerDown(ev)}
                className="relative flex flex-col w-full min-h-full h-fit overflow-x-auto overflow-y-hidden"
                onClick={() => !this.state.moving && this.props.cinematicEditor.inspector.setEditedKey(null, null)}
            >
                <div className="w-full h-10">
                    <CinematicEditorTracker
                        width={width}
                        timeline={this}
                        scale={this.state.scale}
                        currentTime={this.state.currentTime}
                        onTimeChange={(currentTime) => this.setCurrentTime(currentTime)}
                    />
                </div>

                <div
                    style={{
                        left: `${this.state.currentTime * this.state.scale - 1.5}px`,
                    }}
                    onMouseDown={(ev) => ev.stopPropagation()}
                    className="absolute top-10 h-full w-[3px] bg-secondary/35"
                />

                <div
                    style={{
                        width: `${width}px`,
                    }}
                    className="flex flex-col min-w-full"
                >
                    {this.props.cinematic.tracks.map((track, index) => (
                        <CinematicEditorTimelineItem
                            ref={(r) => this.tracks[index] = r}
                            key={`${track.propertyPath}${index}`}
                            track={track}
                            scale={this.state.scale}
                            editor={this.props.editor}
                            cinematic={this.props.cinematic}
                            currentTime={this.state.currentTime}
                            cinematicEditor={this.props.cinematicEditor}
                        />
                    ))}
                </div>
            </div>
        );
    }

    public componentDidMount(): void {
        this._animation = new Animation("editor-currentTime", "_animatedCurrentTime", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    }

    private _getMaxWidthForTimeline(): number {
        return this._getMaxFrameForTimeline() * this.state.scale;
    }

    private _getMaxFrameForTimeline(): number {
        let frame = 0;
        this.props.cinematic.tracks.forEach((track) => {
            track.animationGroups?.forEach((animationGroup) => {
                frame = Math.max(frame, animationGroup.frame + (animationGroup.endFrame - animationGroup.startFrame));
            });

            track.sounds?.forEach((sound) => {
                frame = Math.max(frame, sound.frame + (sound.endFrame - sound.startFrame));
            });

            track.keyFrameAnimations?.forEach((key) => {
                if (isCinematicKeyCut(key)) {
                    frame = Math.max(frame, key.key1.frame);
                } else {
                    frame = Math.max(frame, key.frame);
                }
            });
        });

        return frame;
    }

    private _onWheelEvent(ev: React.WheelEvent<HTMLDivElement>): void {
        if (ev.ctrlKey || ev.metaKey) {
            this.setScale(Math.max(0.1, Math.min(10, this.state.scale + ev.deltaY * 0.001)));
        }
    }

    /**
     * Sets the new scale of the timeline.
     * @param scale defines the new scale value to apply on the timeline.
     */
    public setScale(scale: number): void {
        this.setState({ scale }, () => {
            this.props.cinematicEditor.forceUpdate();
        });
    }

    /**
     * Updates all the track using the current time as reference.
     */
    public updateTracksAtCurrentTime(): void {
        this.setCurrentTime(this.state.currentTime);
    }

    /**
     * Creates a temoporary animation that is used when moving in the timeline.
     * This temporary animation group is disposed on the user releases the mouse button.
     */
    public createTemporaryAnimationGroup(): void {
        this.disposeTemporaryAnimationGroup();

        this._temporaryAnimationGroup = generateCinematicAnimationGroup(
            this.props.cinematic,
            this.props.editor.layout.preview.scene,
        );
    }

    /**
     * Disposes the temporary animation group used when moving in the timeline.
     */
    public disposeTemporaryAnimationGroup(): void {
        this._temporaryAnimationGroup?.dispose();
        this._temporaryAnimationGroup = null;
    }

    /**
     * Sets the current time being edited in the timeline.
     * @param currentTime defines the current time expressed in frame.
     */
    public setCurrentTime(currentTime: number): void {
        this.props.cinematicEditor.stop();

        this.setState({ currentTime });

        const frame = Math.min(currentTime, this._getMaxFrameForTimeline());

        const animationGroup = this._temporaryAnimationGroup ?? generateCinematicAnimationGroup(
            this.props.cinematic,
            this.props.editor.layout.preview.scene,
        );

        animationGroup.start(false);
        animationGroup.goToFrame(frame);
        animationGroup.pause();

        this.props.editor.layout.preview.scene.lights.forEach((light) => {
            updateLightShadowMapRefreshRate(light);
        });

        waitNextAnimationFrame().then(() => {
            if (animationGroup !== this._temporaryAnimationGroup) {
                animationGroup.dispose();
            }
        });
    }

    /**
     * Adds a new key frame at the current time in the timeline for each track.
     */
    public addKeysAtCurrentTrackerPosition(): void {
        // TODO
    }

    /**
     * Removes all the keys at the current tracker position for each track.
     */
    public removeKeysAtCurrentTrackerPosition(): void {
        const configuration: Map<ICinematicTrack, ICinematicKey | ICinematicKeyCut> = new Map();

        this.props.cinematic.tracks.forEach((track) => {
            const key = track.keyFrameAnimations?.find((key) => {
                if (isCinematicKeyCut(key)) {
                    return key.key1.frame === this.state.currentTime;
                }

                return key.frame === this.state.currentTime;
            });

            if (key) {
                configuration.set(track, key);
            }
        });

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                configuration.forEach((key, track) => {
                    track.keyFrameAnimations!.push(key);
                });

                this.tracks.forEach((track) => {
                    track?.sortAnimationsKeys();
                });
            },
            redo: () => {
                configuration.forEach((key, track) => {
                    const index = track.keyFrameAnimations!.indexOf(key);
                    if (index !== -1) {
                        track.keyFrameAnimations!.splice(index, 1);
                    }
                });
            },
        });

        this.props.cinematicEditor.forceUpdate();
    }

    private _handlePointerDown(ev: MouseEvent<HTMLDivElement, globalThis.MouseEvent>): void {
        if (ev.button !== 0 || !isDomElementDescendantOf(ev.nativeEvent.target as HTMLElement, this._divRef!)) {
            return;
        }

        document.body.style.cursor = "ew-resize";

        let mouseUpListener: (event: globalThis.MouseEvent) => void;
        let mouseMoveListener: (event: globalThis.MouseEvent) => void;

        let moving = false;
        let clientX: number | null = null;

        const startPosition = ev.nativeEvent.offsetX / this.state.scale;

        this.createTemporaryAnimationGroup();
        this.setCurrentTime(startPosition);

        document.body.addEventListener("mousemove", mouseMoveListener = (ev) => {
            if (clientX === null) {
                clientX = ev.clientX;
            }

            const delta = clientX - ev.clientX;
            if (moving || Math.abs(delta) > 5 * devicePixelRatio) {
                moving = true;
                this.setState({ moving: true });
            } else {
                return;
            }

            const currentTime = Math.round(
                Math.max(0, startPosition - delta / this.state.scale),
            );

            this.setCurrentTime(currentTime);
        });

        document.body.addEventListener("mouseup", mouseUpListener = (ev) => {
            ev.stopPropagation();

            document.body.style.cursor = "auto";

            document.body.removeEventListener("mouseup", mouseUpListener);
            document.body.removeEventListener("mousemove", mouseMoveListener);

            waitNextAnimationFrame().then(() => {
                this.setState({ moving: false });
            });

            this.disposeTemporaryAnimationGroup();
        });
    }

    /**
     * Plays the current timeline starting from the current tracker position.
     */
    public play(): void {
        if (!this.props.cinematic?.tracks.length) {
            return;
        }

        this._saveSceneState();

        const scene = this.props.editor.layout.preview.scene;
        const engine = this.props.editor.layout.preview.engine;

        const currentTime = this.state.currentTime;
        const maxFrame = this._getMaxFrameForTimeline();

        this._animation.setKeys([
            { frame: currentTime, value: currentTime },
            { frame: maxFrame, value: maxFrame },
        ]);

        const frame = Math.min(currentTime, maxFrame);

        this._generateAnimationGroup = generateCinematicAnimationGroup(this.props.cinematic, scene);
        this._generateAnimationGroup.start(false, 1.0, frame);

        // Start all sounds that were created before the current frame
        this.props.cinematic.tracks.forEach((track) => {
            track.sounds?.forEach((sound) => {
                const endFrame = sound.frame + (sound.endFrame - sound.startFrame);
                if (sound.frame > frame || endFrame < frame) {
                    return;
                }

                const frameDiff = frame - sound.frame;
                const offset = frameDiff / this.props.cinematic.framesPerSecond;

                track.sound?.play(0, offset);
            });
        });

        scene.beginDirectAnimation(this, [this._animation], currentTime, maxFrame, false, 1.0);

        if (this._renderLoop) {
            engine.stopRenderLoop(this._renderLoop);
        }

        engine.runRenderLoop(this._renderLoop = () => {
            this.setState({
                currentTime: this._animatedCurrentTime,
            });

            scene.lights.forEach((light) => {
                updateLightShadowMapRefreshRate(light);
            });
        });
    }

    /**
     * Stops the current timeline being played
     */
    public stop(): void {
        const engine = this.props.editor.layout.preview.engine;

        if (this._renderLoop) {
            engine.stopRenderLoop(this._renderLoop);
            this._renderLoop = null;
        }

        this._generateAnimationGroup?.dispose();

        // Stop all sounds
        this.props.cinematic.tracks.forEach((track) => {
            track.sound?.stop();
        });

        this._restoreSceneState();
    }

    public _saveSceneState(): void {
        const scene = this.props.editor.layout.preview.scene;
        const nodes = [...scene.transformNodes, ...scene.meshes, ...scene.lights, ...scene.cameras];

        nodes.forEach((node) => {
            this._sceneState.set(node, {
                isEnabled: node.isEnabled(false),

                position: isAbstractMesh(node) ? node.position.clone() : null,
                rotation: isAbstractMesh(node) ? node.rotation.clone() : null,
                scaling: isAbstractMesh(node) ? node.scaling.clone() : null,
                rotationQuaternion: isAbstractMesh(node) ? node.rotationQuaternion?.clone() : null,
            });

            if (isAbstractMesh(node) && node.physicsAggregate?.body) {
                node.physicsAggregate.body.disableSync = false;

                const position = node.getAbsolutePosition();
                const orientation = node.rotationQuaternion ?? node.rotation.toQuaternion();

                const physicsEngine = scene.getPhysicsEngine()?.getPhysicsPlugin() as HavokPlugin | null;

                physicsEngine?._hknp.HP_Body_SetQTransform(
                    node.physicsAggregate.body._pluginData.hpBodyId,
                    [
                        [position.x, position.y, position.z],
                        [orientation.x, orientation.y, orientation.z, orientation.w],
                    ],
                );
            }
        });
    }

    public _restoreSceneState(): void {
        this._sceneState.forEach((config, node) => {
            node.setEnabled(config.isEnabled);

            if (isAbstractMesh(node)) {
                if (config.position) {
                    node.position.copyFrom(config.position);
                }

                if (config.rotation) {
                    node.rotation.copyFrom(config.rotation);
                }

                if (config.rotationQuaternion) {
                    node.rotationQuaternion?.copyFrom(config.rotationQuaternion);
                }

                if (config.scaling) {
                    node.scaling.copyFrom(config.scaling);
                }

                if (node.physicsAggregate?.body) {
                    node.physicsAggregate.body.disableSync = true;
                    node.physicsAggregate.body.setLinearVelocity(Vector3.Zero());
                    node.physicsAggregate.body.setAngularVelocity(Vector3.Zero());
                }
            }
        });

        this._sceneState = new Map();
    }
}

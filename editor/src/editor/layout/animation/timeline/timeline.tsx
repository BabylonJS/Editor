import { AiOutlinePlus } from "react-icons/ai";
import { Component, MouseEvent, ReactNode } from "react";

import { Animation, IAnimatable, IAnimationKey } from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { waitNextAnimationFrame } from "../../../../tools/tools";
import { isDomElementDescendantOf } from "../../../../tools/dom";
import { getInspectorPropertyValue } from "../../../../tools/property";

import { Editor } from "../../../main";

import { EditorAnimation } from "../../animation";

import { EditorAnimationTracker } from "./tracker";
import { EditorAnimationTimelineItem } from "./track";

export interface IEditorAnimationTimelinePanelProps {
    editor: Editor;
    animatable: IAnimatable | null;
    animationEditor: EditorAnimation;
}

export interface IEditorAnimationTimelinePanelState {
    scale: number;
    moving: boolean;
    currentTime: number;
}

export class EditorAnimationTimelinePanel extends Component<IEditorAnimationTimelinePanelProps, IEditorAnimationTimelinePanelState> {
    /**
     * This class acts as an IAnimatable. This is used to animate the currentTime value on the state
     * and be synchronized with the animations being edited and played by Babylon.JS.
     */
    public animations: Animation[] = [];
    /**
     * Defines the list of all available track items in the timeline.
     */
    public tracks: (EditorAnimationTimelineItem | null)[] = [];

    private _animation!: Animation;
    private _animatedCurrentTime: number = 0;
    private _renderLoop: (() => void) | null = null;

    private _divRef: HTMLDivElement | null = null;

    public constructor(props: IEditorAnimationTimelinePanelProps) {
        super(props);

        this.state = {
            scale: 1,
            moving: false,
            currentTime: 0,
        };
    }

    public render(): ReactNode {
        if (this.props.animatable) {
            if (!this.props.animatable.animations?.length) {
                return this._getEmptyAnimations();
            }

            return this._getAnimationsList(this.props.animatable.animations!);
        }

        return this._getEmpty();
    }

    public componentDidMount(): void {
        this._animation = new Animation("editor-currentTime", "_animatedCurrentTime", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    }

    private _getEmpty(): ReactNode {
        return (
            <div className="flex justify-center items-center font-semibold text-xl w-full h-full">
                No object selected.
            </div>
        );
    }

    private _getEmptyAnimations(): ReactNode {
        return (
            <div className="flex flex-col gap-2 justify-center items-center font-semibold text-xl w-full h-full">
                <div className="">
                    No animations found on this object.
                </div>

                <Button variant="secondary" className="flex items-center gap-2" onClick={() => this.props.animationEditor.tracks.addTrack()}>
                    <AiOutlinePlus className="w-5 h-5" /> Add Track
                </Button>
            </div>
        );
    }

    private _getAnimationsList(animations: Animation[]): ReactNode {
        const width = this._getMaxWidthForTimeline();

        this.tracks.splice(0, this.tracks.length);
        this.tracks.length = animations.length;

        return (
            <div
                ref={(r) => this._divRef = r}
                onWheel={(ev) => this._onWheelEvent(ev)}
                onMouseDown={(ev) => this._handlePointerDown(ev)}
                className="relative flex flex-col w-full h-full overflow-x-auto overflow-y-hidden"
                onClick={() => !this.state.moving && this.props.animationEditor.inspector.setEditedKey(null)}
            >
                <EditorAnimationTracker
                    width={width}
                    scale={this.state.scale}
                    currentTime={this.state.currentTime}
                    onTimeChange={(currentTime) => this.setCurrentTime(currentTime)}
                />

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
                    {animations.map((animation, index) => (
                        <EditorAnimationTimelineItem
                            ref={(r) => this.tracks[index] = r}
                            key={`${animation.targetProperty}${index}`}
                            animation={animation}
                            scale={this.state.scale}
                            animatable={this.props.animatable}
                            currentTime={this.state.currentTime}
                            animationEditor={this.props.animationEditor}
                        />
                    ))}
                </div>
            </div>
        );
    }

    private _getMaxWidthForTimeline(): number {
        return this._getMaxFrameForTimeline() * this.state.scale;
    }

    private _getMaxFrameForTimeline(): number {
        let frame = 0;
        this.props.animatable?.animations?.forEach((animation) => {
            animation.getKeys().forEach((key) => {
                frame = Math.max(frame, key.frame);
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
     * Updates all the track using the current time as reference.
     */
    public updateTracksAtCurrentTime(): void {
        this.setCurrentTime(this.state.currentTime);
    }

    /**
     * Sets the current time being edited in the timeline.
     * @param currentTime defines the current time expressed in frame.
     */
    public setCurrentTime(currentTime: number): void {
        if (!this.props.animatable?.animations) {
            return;
        }

        this.props.animationEditor.stop();

        this.setState({ currentTime });

        this.props.animatable.animations.forEach((animation) => {
            const keys = animation.getKeys();
            const frame = keys[keys.length - 1].frame < currentTime ? keys[keys.length - 1].frame : currentTime;

            this.props.editor.layout.preview.scene.beginDirectAnimation(this.props.animatable, [animation], frame, frame, false, 1.0);
        });
    }

    /**
     * Sets the new scale of the timeline.
     * @param scale defines the new scale value to apply on the timeline.
     */
    public setScale(scale: number): void {
        this.setState({ scale }, () => {
            this.props.animationEditor.forceUpdate();
        });
    }

    /**
     * Adds a key at the current time for all tracks in the timeline.
     * Checks for each track if a key already exists at the current time and if not, adds a new key.
     * For the value, sets the current value of the animatable object property being animated.
     */
    public addKeysAtCurrentTime(): void {
        const frame = Math.round(this.state.currentTime / this.state.scale);

        const tracks = this.tracks.filter((track) => !track?.props.animation.getKeys().find((k) => k.frame === frame)) as EditorAnimationTimelineItem[];
        if (!tracks.length) {
            return;
        }

        const keys = tracks.map((track) => {
            const value = getInspectorPropertyValue(this.props.animatable, track.props.animation.targetProperty);

            return {
                frame,
                value: value.clone?.() ?? value,
            } as IAnimationKey;
        });

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                tracks.forEach((track, index) => {
                    const keyIndex = track.props.animation.getKeys().indexOf(keys[index]);
                    if (keyIndex !== -1) {
                        track.props.animation.getKeys().splice(keyIndex, 1);
                    }
                });
            },
            redo: () => {
                tracks.forEach((track, index) => {
                    track.props.animation.getKeys().push(keys[index]);
                });
            },
            action: () => {
                tracks.forEach((track) => {
                    track.props.animation.getKeys().sort((a, b) => a.frame - b.frame);
                });
            },
        });

        this.forceUpdate();
    }

    /**
     * Plays the current timeline starting from the current tracker position.
     */
    public play(): void {
        if (!this.props.animatable?.animations) {
            return;
        }

        const scene = this.props.editor.layout.preview.scene;
        const engine = this.props.editor.layout.preview.engine;

        const currentTime = this.state.currentTime;
        const maxFrame = this._getMaxFrameForTimeline();

        this._animation.setKeys([
            { frame: currentTime, value: currentTime },
            { frame: maxFrame, value: maxFrame },
        ]);

        scene.stopAnimation(this.props.animatable);

        this.props.animatable.animations.forEach((animation) => {
            const keys = animation.getKeys();
            const frame = keys[keys.length - 1].frame < currentTime ? keys[keys.length - 1].frame : currentTime;

            this.props.editor.layout.preview.scene.beginDirectAnimation(this.props.animatable, [animation], frame, maxFrame, false, 1.0);
        });

        this.props.editor.layout.preview.scene.beginDirectAnimation(this, [this._animation], currentTime, maxFrame, false, 1.0);

        if (this._renderLoop) {
            engine.stopRenderLoop(this._renderLoop);
        }

        engine.runRenderLoop(this._renderLoop = () => {
            this.setState({ currentTime: this._animatedCurrentTime });
        });
    }

    /**
     * Stops the current timeline being played
     */
    public stop(): void {
        const scene = this.props.editor.layout.preview.scene;
        const engine = this.props.editor.layout.preview.engine;

        if (this._renderLoop) {
            engine.stopRenderLoop(this._renderLoop);
            this._renderLoop = null;
        }

        scene.stopAnimation(this.props.animatable);
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
        });
    }
}

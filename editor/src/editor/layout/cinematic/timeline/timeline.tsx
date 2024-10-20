import { Component, MouseEvent, ReactNode } from "react";

import { Animation, AnimationGroup } from "babylonjs";

import { Editor } from "../../../main";

import { waitNextAnimationFrame } from "../../../../tools/tools";
import { isDomElementDescendantOf } from "../../../../tools/dom";

import { ICinematic } from "../schema/typings";
import { isCinematicKeyCut } from "../schema/guards";

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

    private _divRef: HTMLDivElement | null = null;

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
                // onClick={() => !this.state.moving && this.props.animationEditor.inspector.setEditedKey(null)}
                className="relative flex flex-col w-full h-full overflow-x-auto overflow-y-hidden"
            >
                <CinematicEditorTracker
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
                const animationGroupRef = track.animationGroup as AnimationGroup;
                const animationGroupFramesCount = animationGroupRef
                    ? animationGroupRef.to - animationGroupRef.from
                    : 0;

                frame = Math.max(frame, animationGroup.frame + animationGroupFramesCount);
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
     * Sets the current time being edited in the timeline.
     * @param currentTime defines the current time expressed in frame.
     */
    public setCurrentTime(currentTime: number): void {
        this.props.cinematicEditor.stop();

        this.setState({ currentTime });

        const frame = Math.min(currentTime, this._getMaxFrameForTimeline());

        const animationGroup = generateCinematicAnimationGroup(
            this.props.cinematic,
            this.props.editor.layout.preview.scene,
        );

        animationGroup.start(false);
        animationGroup.goToFrame(frame);
        animationGroup.pause();

        waitNextAnimationFrame().then(() => {
            animationGroup.dispose();
        });
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

    /**
     * Plays the current timeline starting from the current tracker position.
     */
    public play(): void {
        if (!this.props.cinematic?.tracks.length) {
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

        const frame = Math.min(currentTime, maxFrame);

        this._generateAnimationGroup = generateCinematicAnimationGroup(this.props.cinematic, scene);
        this._generateAnimationGroup.start(false, 1.0, frame);

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
        const engine = this.props.editor.layout.preview.engine;

        if (this._renderLoop) {
            engine.stopRenderLoop(this._renderLoop);
            this._renderLoop = null;
        }

        this._generateAnimationGroup?.dispose();
    }
}

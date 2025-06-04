import { Component, MouseEvent, ReactNode } from "react";

import { AiOutlinePlus } from "react-icons/ai";

import { Tools, Sound, AnimationGroup } from "babylonjs";
import { ICinematicAnimationGroup, ICinematicKey, ICinematicKeyCut, ICinematicKeyEvent, ICinematicSound, ICinematicTrack, isCinematicKeyCut } from "babylonjs-editor-tools";

import { registerUndoRedo } from "../../../tools/undoredo";
import { isDomElementDescendantOf } from "../../../tools/dom";
import { getInspectorPropertyValue } from "../../../tools/property";
import { updateLightShadowMapRefreshRate } from "../../../tools/light/shadows";

import { getDefaultRenderingPipeline } from "../../rendering/default-pipeline";

import { showAlert } from "../../../ui/dialog";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "../../../ui/shadcn/ui/context-menu";

import { CinematicEditor } from "./editor";

import { CinematicEditorKeyBase } from "./timelines/base";
import { CinematicEditorTracker } from "./timelines/tracker";

export interface ICinematicEditorTimelinesProps {
    cinematicEditor: CinematicEditor;
}

export interface ICinematicEditorTimelinesState {
    scale: number;
    currentTime: number;

    rightClickPositionX: number | null;
}

export class CinematicEditorTimelines extends Component<ICinematicEditorTimelinesProps, ICinematicEditorTimelinesState> {
    private _divRef: HTMLDivElement | null = null;

    public constructor(props: ICinematicEditorTimelinesProps) {
        super(props);

        this.state = {
            scale: 1,
            currentTime: 0,
            rightClickPositionX: null,
        };
    }

    public render(): ReactNode {
        const width = this.getMaxWidthForTimelines();
        const cinematic = this.props.cinematicEditor.cinematic;

        return (
            <div
                ref={(r) => this._divRef = r}
                onMouseDown={(ev) => this._handlePointerDown(ev)}
                className="relative flex flex-col flex-1 h-full overflow-x-auto overflow-y-hidden"
            >
                <CinematicEditorTracker
                    cinematicEditor={this.props.cinematicEditor}
                    width={width}
                    scale={this.state.scale}
                    currentTime={this.state.currentTime}
                />

                <div
                    style={{
                        left: `${this.state.currentTime * this.state.scale}px`,
                    }}
                    className="absolute w-[1px] ml-2 mt-10 bg-border h-full pointer-events-none"
                />

                {cinematic.tracks.map((track, index) => {
                    return this._getTrack(track, width, index === 0);
                })}
            </div>
        );
    }

    private _getTrack(track: ICinematicTrack, width: number, borderTop: boolean): ReactNode {
        track._id ??= Tools.RandomId();

        return (
            <ContextMenu
                key={track._id}
                onOpenChange={(o) => !o && this.setState({ rightClickPositionX: null })}
            >
                <ContextMenuTrigger>
                    <div
                        className={`
                            relative min-w-full h-10 mx-2 py-2
                            ${borderTop ? "border-t border-t-border/50" : ""}
                            border-b border-b-border/50
                            border-r border-r-border/50
                            border-l border-l-border/50
                            ${this.props.cinematicEditor.state.hoverTrack === track ? "bg-secondary" : ""}
                            transition-all duration-300 ease-in-out
                        `}
                        style={{
                            width: `${width}px`,
                        }}
                        onContextMenu={(ev) => this.setState({ rightClickPositionX: ev.nativeEvent.offsetX })}
                        onMouseEnter={() => this.props.cinematicEditor.setState({ hoverTrack: track })}
                        onMouseLeave={() => this.props.cinematicEditor.setState({ hoverTrack: null })}
                    >
                        {track.keyFrameAnimations?.map((keyframe, index) => (
                            <CinematicEditorKeyBase
                                key={index}
                                cinematicEditor={this.props.cinematicEditor}
                                scale={this.state.scale}
                                cinematicKey={keyframe}
                                onRemoved={() => this.removeAnimationKey(track, keyframe)}
                            />
                        ))}

                        {track.sounds?.map((sound, index) => (
                            <CinematicEditorKeyBase
                                key={index}
                                cinematicEditor={this.props.cinematicEditor}
                                scale={this.state.scale}
                                cinematicKey={sound}
                                onRemoved={() => this.removeSoundKey(track, sound)}
                            />
                        ))}

                        {track.keyFrameEvents?.map((event, index) => (
                            <CinematicEditorKeyBase
                                key={index}
                                cinematicEditor={this.props.cinematicEditor}
                                scale={this.state.scale}
                                cinematicKey={event}
                                onRemoved={() => this.removeEventKey(track, event)}
                            />
                        ))}

                        {track.animationGroups?.map((animationGroup, index) => (
                            <CinematicEditorKeyBase
                                key={index}
                                cinematicEditor={this.props.cinematicEditor}
                                scale={this.state.scale}
                                cinematicKey={animationGroup}
                                onRemoved={() => this.removeAnimationGroupKey(track, animationGroup)}
                            />
                        ))}
                    </div>
                </ContextMenuTrigger>

                <ContextMenuContent>
                    {track.keyFrameAnimations &&
                        <>
                            <ContextMenuItem className="flex items-center gap-2" onClick={() => this.addAnimationKey("key", track)}>
                                <div className="w-4 h-4 rotate-45 border-[2px] bg-muted-foreground" />
                                Add Key Here
                            </ContextMenuItem>
                            <ContextMenuItem className="flex items-center gap-2" onClick={() => this.addAnimationKey("cut", track)}>
                                <div className="w-4 h-4 rotate-45 border-[2px] border-orange-500 bg-muted" />
                                Add Key Cut Here
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem className="flex items-center gap-2" onClick={() => this.addAnimationKey("key", track, this.state.currentTime * this.state.scale)}>
                                <div className="w-4 h-4 rotate-45 border-[2px] bg-muted-foreground" />
                                Add Key at Tracker Position
                            </ContextMenuItem>
                            <ContextMenuItem className="flex items-center gap-2" onClick={() => this.addAnimationKey("cut", track, this.state.currentTime * this.state.scale)}>
                                <div className="w-4 h-4 rotate-45 border-[2px] border-orange-500 bg-muted" />
                                Add Key Cut at Tracker Position
                            </ContextMenuItem>
                        </>
                    }

                    {track.sounds &&
                        <>
                            <ContextMenuItem className="flex items-center gap-2" onClick={() => this.addSoundKey(track)}>
                                <AiOutlinePlus className="w-5 h-5" /> Add Sound Here
                            </ContextMenuItem>
                            <ContextMenuItem className="flex items-center gap-2" onClick={() => this.addSoundKey(track, this.state.currentTime * this.state.scale)}>
                                <AiOutlinePlus className="w-5 h-5" /> Add Sound at Tracker Position
                            </ContextMenuItem>
                        </>
                    }

                    {track.keyFrameEvents &&
                        <>
                            <ContextMenuItem className="flex items-center gap-2" onClick={() => this.addEventKey(track)}>
                                <AiOutlinePlus className="w-5 h-5" /> Add Event Here
                            </ContextMenuItem>
                            <ContextMenuItem className="flex items-center gap-2" onClick={() => this.addEventKey(track, this.state.currentTime * this.state.scale)}>
                                <AiOutlinePlus className="w-5 h-5" /> Add Event At Tracker Position
                            </ContextMenuItem>
                        </>
                    }

                    {track.animationGroups &&
                        <>
                            <ContextMenuItem className="flex items-center gap-2" onClick={() => this.addAnimationGroupKey(track)}>
                                <AiOutlinePlus className="w-5 h-5" /> Add Group Here
                            </ContextMenuItem>
                            <ContextMenuItem className="flex items-center gap-2" onClick={() => this.addAnimationGroupKey(track, this.state.currentTime * this.state.scale)}>
                                <AiOutlinePlus className="w-5 h-5" /> Add Group at Tracker Position
                            </ContextMenuItem>
                        </>
                    }
                </ContextMenuContent>
            </ContextMenu>
        );
    }

    public getMaxWidthForTimelines(): number {
        return this.getMaxFrameForTimelines() * this.state.scale;
    }

    public getMaxFrameForTimelines(): number {
        let frame = 0;
        this.props.cinematicEditor.cinematic.tracks.forEach((track) => {
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

    public setCurrentTime(time: number): void {
        this.setState({
            currentTime: time,
        });

        this.props.cinematicEditor.stop();

        const group = this.props.cinematicEditor.createTemporaryAnimationGroup();
        group.start(false);
        group.goToFrame(time);
        group.pause();

        this.props.cinematicEditor.editor.layout.preview.scene.lights.forEach((light) => {
            updateLightShadowMapRefreshRate(light);
        });
    }

    public addAnimationKey(type: "key" | "cut", track: ICinematicTrack, positionX?: number | null) {
        positionX ??= this.state.rightClickPositionX;

        const node = track.defaultRenderingPipeline
            ? getDefaultRenderingPipeline()
            : track.node;

        if (positionX === null || !node || !track.propertyPath) {
            return;
        }

        const frame = Math.round(positionX / this.state.scale);
        const value = getInspectorPropertyValue(node, track.propertyPath);

        const existingKey = track.keyFrameAnimations!.find((k) => {
            if (isCinematicKeyCut(k)) {
                return k.key1.frame === frame;
            } else {
                return k.frame === frame;
            }
        });

        if (existingKey) {
            return;
        }

        const key = type === "key"
            ? {
                frame,
                type: "key",
                value: value.clone?.() ?? value,
            } as ICinematicKey
            : {
                type: "cut",
                key1: {
                    frame,
                    value: value.clone?.() ?? value,
                },
                key2: {
                    frame,
                    value: value.clone?.() ?? value,
                },
            } as ICinematicKeyCut;

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                const index = track.keyFrameAnimations!.indexOf(key);
                if (index !== -1) {
                    track.keyFrameAnimations!.splice(index, 1);
                }
            },
            redo: () => track.keyFrameAnimations!.push(key),
            action: () => this.sortAnimationsKeys(),
        });

        this.setState({
            rightClickPositionX: null
        });
    }

    public removeAnimationKey(track: ICinematicTrack, keyframe: ICinematicKey | ICinematicKeyCut): void {
        const index = track.keyFrameAnimations!.indexOf(keyframe);
        if (index === -1) {
            return;
        }

        registerUndoRedo({
            executeRedo: true,
            undo: () => track.keyFrameAnimations!.splice(index, 0, keyframe),
            redo: () => track.keyFrameAnimations!.splice(index, 1),
        });

        this.props.cinematicEditor.forceUpdate();
    }

    public addSoundKey(track: ICinematicTrack, positionX?: number | null) {
        positionX ??= this.state.rightClickPositionX;

        if (positionX === null || !track.sound) {
            return;
        }

        const frame = Math.round(positionX / this.state.scale);
        const existingKey = track.sounds!.find((k) => k.frame === frame);

        if (existingKey) {
            return;
        }

        const sound = track.sound as Sound;
        const buffer = sound.getAudioBuffer();

        if (!buffer) {
            return showAlert(
                "Can't add sound track",
                "The sound track is not ready yet, please wait until the sound is loaded. If this problem persists, please verify the sound file is correctly loaded.",
            );
        }

        const duration = buffer.duration;
        const fps = this.props.cinematicEditor.cinematic.framesPerSecond;

        const key = {
            frame,
            type: "sound",
            speed: 1,
            startFrame: 0,
            endFrame: duration * fps,
        } as ICinematicSound;

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                const index = track.sounds!.indexOf(key);
                if (index !== -1) {
                    track.sounds!.splice(index, 1);
                }
            },
            redo: () => track.sounds!.push(key),
            action: () => this.sortAnimationsKeys(),
        });

        this.setState({
            rightClickPositionX: null,
        });
    }

    public removeSoundKey(track: ICinematicTrack, soundKey: ICinematicSound): void {
        const index = track.sounds!.indexOf(soundKey);
        if (index === -1) {
            return;
        }

        registerUndoRedo({
            executeRedo: true,
            undo: () => track.sounds!.splice(index, 0, soundKey),
            redo: () => track.sounds!.splice(index, 1),
        });

        this.props.cinematicEditor.forceUpdate();
    }

    public addEventKey(track: ICinematicTrack, positionX?: number | null): void {
        positionX ??= this.state.rightClickPositionX;

        if (positionX === null) {
            return;
        }

        const frame = Math.round(positionX / this.state.scale);

        const existingKey = track.keyFrameEvents!.find((k) => {
            return k.frame === frame;
        });

        if (existingKey) {
            return;
        }

        const key = {
            frame,
            type: "event",
        } as ICinematicKeyEvent;

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                const index = track.keyFrameEvents!.indexOf(key);
                if (index !== -1) {
                    track.keyFrameEvents!.splice(index, 1);
                }
            },
            redo: () => track.keyFrameEvents!.push(key),
            action: () => this.sortAnimationsKeys(),
        });

        this.setState({
            rightClickPositionX: null
        });
    }

    public removeEventKey(track: ICinematicTrack, eventKey: ICinematicKeyEvent): void {
        const index = track.keyFrameEvents!.indexOf(eventKey);
        if (index === -1) {
            return;
        }

        registerUndoRedo({
            executeRedo: true,
            undo: () => track.keyFrameEvents!.splice(index, 0, eventKey),
            redo: () => track.keyFrameEvents!.splice(index, 1),
        });

        this.props.cinematicEditor.forceUpdate();
    }

    public addAnimationGroupKey(track: ICinematicTrack, positionX?: number | null): void {
        positionX ??= this.state.rightClickPositionX;

        if (positionX === null || !track.animationGroup) {
            return;
        }

        const frame = Math.round(positionX / this.state.scale);
        const existingKey = track.animationGroups!.find((k) => k.frame === frame);

        if (existingKey) {
            return;
        }

        const animationGroup = track.animationGroup as AnimationGroup;

        const key = {
            frame,
            type: "group",
            speed: 1,
            startFrame: animationGroup.from,
            endFrame: animationGroup.to,
        } as ICinematicAnimationGroup;

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                const index = track.animationGroups!.indexOf(key);
                if (index !== -1) {
                    track.animationGroups!.splice(index, 1);
                }
            },
            redo: () => track.animationGroups!.push(key),
            action: () => this.sortAnimationsKeys(),
        });

        this.setState({
            rightClickPositionX: null
        });
    }

    public removeAnimationGroupKey(track: ICinematicTrack, animationGroup: ICinematicAnimationGroup): void {
        const index = track.animationGroups!.indexOf(animationGroup);
        if (index === -1) {
            return;
        }

        registerUndoRedo({
            executeRedo: true,
            undo: () => track.animationGroups!.splice(index, 0, animationGroup),
            redo: () => track.animationGroups!.splice(index, 1),
        });

        this.props.cinematicEditor.forceUpdate();
    }

    /**
     * Sorts all the keys in the track based on their frame value.
     */
    public sortAnimationsKeys(): void {
        this.props.cinematicEditor.cinematic.tracks.forEach((track) => {
            track.keyFrameAnimations?.sort((a, b) => {
                const frameA = isCinematicKeyCut(a) ? a.key1.frame : a.frame;
                const frameB = isCinematicKeyCut(b) ? b.key1.frame : b.frame;

                return frameA - frameB;
            });

            track.keyFrameEvents?.sort((a, b) => {
                return a.frame - b.frame;
            });

            track.animationGroups?.sort((a, b) => {
                return a.frame - b.frame;
            });

            track.sounds?.sort((a, b) => {
                return a.frame - b.frame;
            });

            track._id = Tools.RandomId(); // Update the ID to force a re-render
        });
    }

    private _handlePointerDown(ev: MouseEvent<HTMLDivElement>): void {
        if (ev.button !== 0 || !isDomElementDescendantOf(ev.nativeEvent.target as HTMLElement, this._divRef!)) {
            return;
        }

        document.body.style.cursor = "ew-resize";

        let mouseUpListener: (event: globalThis.MouseEvent) => void;
        let mouseMoveListener: (event: globalThis.MouseEvent) => void;

        let moving = false;
        let clientX: number | null = null;

        const startPosition = ev.nativeEvent.offsetX / this.state.scale;

        this.props.cinematicEditor.createTemporaryAnimationGroup();
        this.setCurrentTime(startPosition);

        document.body.addEventListener("mousemove", mouseMoveListener = (ev) => {
            if (clientX === null) {
                clientX = ev.clientX;
            }

            const delta = clientX - ev.clientX;
            if (moving || Math.abs(delta) > 5 * devicePixelRatio) {
                moving = true;
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

            this.props.cinematicEditor.disposeTemporaryAnimationGroup();
        });
    }
}

import { Component, ReactNode } from "react";

import { Animation, IAnimatable } from "babylonjs";

import { isNode } from "../../tools/guards/nodes";
import { isScene } from "../../tools/guards/scene";
import { isDomElementFocusable } from "../../tools/dom";

import { Editor } from "../main";

import { EditorAnimationToolbar } from "./animation/toolbar";
import { EditorAnimationTracksPanel } from "./animation/tracks/tracks";
import { EditorAnimationInspector } from "./animation/inspector/inspector";
import { EditorAnimationTimelinePanel } from "./animation/timeline/timeline";

import { ICinematic } from "./animation/cinematic/typings";

export interface IEditorAnimationProps {
    /**
     * Defines the reference to the editor.
     */
    editor: Editor;
}

export interface IEditorAnimationState {
    playing: boolean;
    focused: boolean;

    cinematic: ICinematic | null;
    animatable: IAnimatable | null;

    selectedAnimation: Animation | null;
}

const isEnabled = false;

export class EditorAnimation extends Component<IEditorAnimationProps, IEditorAnimationState> {
    /**
     * Defines the reference to the inspector used to edit animations properties.
     */
    public inspector!: EditorAnimationInspector;
    /**
     * Defines the reference to the tracks panel component used to display the animations tracks.
     */
    public tracks!: EditorAnimationTracksPanel;
    /**
     * Defines the reference to the timelines panel component used to display the animations timeline.
     */
    public timelines!: EditorAnimationTimelinePanel;

    private _playing: boolean = false;
    private _currentTimeBeforePlay: number | null = null;

    private _onKeyUpListener: (event: KeyboardEvent) => void;

    public constructor(props: IEditorAnimationProps) {
        super(props);

        this.state = {
            playing: false,
            focused: false,
            cinematic: null,
            animatable: null,
            selectedAnimation: null,
        };
    }

    public render(): ReactNode {
        if (!isEnabled) {
            return (
                <div className="flex justify-center items-center w-full h-full font-semibold text-3xl">
                    Coming Soon
                </div>
            );
        }

        return (
            <div className="flex flex-col min-w-full h-full">
                <EditorAnimationToolbar
                    animationEditor={this}
                    playing={this.state.playing}
                    animatable={this.state.animatable}
                />

                <div className="flex w-full h-10">
                    <div className="flex justify-center items-center font-semibold w-96 h-full bg-secondary">
                        Tracks
                    </div>

                    <div className="w-1 h-full bg-primary-foreground" />

                    <div className="flex justify-center items-center font-semibold w-full h-full bg-secondary">
                        Timeline
                    </div>
                </div>

                <div
                    onClick={() => this.setState({ focused: true })}
                    onMouseLeave={() => this.setState({ focused: false })}
                    className="relative flex w-full h-full overflow-x-hidden overflow-y-auto"
                >
                    <EditorAnimationTracksPanel
                        animationEditor={this}
                        ref={(r) => this.tracks = r!}
                        animatable={this.state.animatable}
                    />

                    <div className="w-1 h-full bg-primary-foreground" />

                    <EditorAnimationTimelinePanel
                        animationEditor={this}
                        editor={this.props.editor}
                        ref={(r) => this.timelines = r!}
                        animatable={this.state.animatable}
                    />

                    <EditorAnimationInspector
                        animationEditor={this}
                        ref={(r) => this.inspector = r!}
                    />
                </div>
            </div>
        );
    }

    public componentDidMount(): void {
        window.addEventListener("keyup", this._onKeyUpListener = (ev) => {
            if (ev.key !== " " || !this.state.focused) {
                return;
            }

            if (!isDomElementFocusable(document.activeElement)) {
                if (this.state.playing) {
                    this.stop();
                } else {
                    this.play();
                }
            }
        });
    }

    public componentWillUnmount(): void {
        window.removeEventListener("keyup", this._onKeyUpListener);
    }

    /**
     * Sets the reference to the edited object, selected somewhere in the graph or the preview, to edit its animations.
     * @param object defines the reference to the object that has been selected somewhere in the graph or the preview.
     */
    public setEditedObject(object: unknown): void {
        if (isNode(object) || isScene(object)) {
            if (!object.animations) {
                object.animations = [];
            }

            this.setState({
                cinematic: null,
                animatable: object,
            });
        }
    }

    /**
     * Sets the reference to the edited cinematic object to edit its animations.
     * @param cinematic defines the reference to the cinematic object to edit.
     */
    public setEditedCinematic(cinematic: ICinematic): void {
        this.setState({
            cinematic,
            animatable: null,
        });
    }

    /**
     * Plays the current timeline starting from the current tracker position.
     */
    public play(): void {
        if (this._playing) {
            return;
        }

        this.setState({ playing: true });

        this._playing = true;
        this._currentTimeBeforePlay = this.timelines.state.currentTime;

        this.timelines.play();
    }

    /**
     * Stops the current timeline being played and returns to the previous tracker position
     * saved before the timeline was played.
     */
    public stop(): void {
        if (!this._playing) {
            return;
        }

        this._playing = false;
        this.setState({ playing: false });

        this.timelines.stop();

        if (this._currentTimeBeforePlay !== null) {
            this.timelines.setCurrentTime(this._currentTimeBeforePlay);
            this._currentTimeBeforePlay = null;
        }
    }
}

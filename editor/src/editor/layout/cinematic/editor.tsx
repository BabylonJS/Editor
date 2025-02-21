import { writeJSON } from "fs-extra";

import { toast } from "sonner";
import { Component, ReactNode } from "react";

import { Observer } from "babylonjs";

import { isDomElementFocusable } from "../../../tools/dom";
import { saveSingleFileDialog } from "../../../tools/dialog";
import { onRedoObservable, onUndoObservable } from "../../../tools/undoredo";

import { Editor } from "../../main";

import { ICinematic, ICinematicTrack } from "./schema/typings";

import { CinematicEditorToolbar } from "./toolbar";
import { CinematicEditorTracksPanel } from "./tracks/tracks";
import { serializeCinematic } from "./serialization/serialize";
import { CinematicRenderer, RenderType } from "./render/render";
import { CinematicEditorInspector } from "./inspector/inspector";
import { CinematicEditorTimelinePanel } from "./timeline/timeline";
import { CinematicEditorConfiguration } from "./timeline/configuration";

export interface ICinematicEditorProps {
    editor: Editor;
    absolutePath: string;
    cinematic: ICinematic;
}

export interface ICinematicEditorState {
    playing: boolean;
    focused: boolean;
    selectedTrack: ICinematicTrack | null;
}

export class CinematicEditor extends Component<ICinematicEditorProps, ICinematicEditorState> {
    /**
     * Defines the reference to the inspector used to edit animations properties.
     */
    public inspector!: CinematicEditorInspector;
    /**
     * Defines the reference to the tracks panel component used to display the animations tracks.
     */
    public tracks!: CinematicEditorTracksPanel;
    /**
     * Defines the reference to the timelines panel component used to display the animations timeline.
     */
    public timelines!: CinematicEditorTimelinePanel;
    /**
     * Defines the reference to the cinematic renderer used to render cinematic into video file.
     */
    public cinematicRenderer!: CinematicRenderer;

    private _undoObserver: Observer<void> | null = null;
    private _redoObserver: Observer<void> | null = null;

    private _playing: boolean = false;
    private _currentTimeBeforePlay: number | null = null;

    private _onKeyUpListener: (event: KeyboardEvent) => void;

    public constructor(props: ICinematicEditorProps) {
        super(props);

        this.state = {
            playing: false,
            focused: false,
            selectedTrack: null,
        };
    }

    public render(): ReactNode {
        return (
            <div className="relative flex flex-col min-w-full h-full">
                <CinematicEditorToolbar
                    cinematicEditor={this}
                    editor={this.props.editor}
                    playing={this.state.playing}
                />

                <div className="relative flex w-full h-10 overflow-hidden">
                    <div className="flex justify-center items-center font-semibold w-96 h-full bg-secondary">
                        <div className="w-96">
                            Tracks
                        </div>
                    </div>

                    <div className="w-1 h-full bg-primary-foreground" />

                    <div className="flex justify-center items-center gap-2 font-semibold w-full h-full bg-secondary">
                        Timeline

                        <CinematicEditorConfiguration
                            cinematicEditor={this}
                            cinematic={this.props.cinematic}
                        />
                    </div>
                </div>

                <div
                    onClick={() => this.setState({ focused: true })}
                    onMouseLeave={() => this.setState({ focused: false })}
                    className="relative flex w-full h-full overflow-x-hidden overflow-y-auto"
                >
                    <CinematicEditorTracksPanel
                        cinematicEditor={this}
                        editor={this.props.editor}
                        ref={(r) => this.tracks = r!}
                        cinematic={this.props.cinematic}
                    />

                    <div className="w-1 h-full bg-primary-foreground" />

                    <CinematicEditorTimelinePanel
                        cinematicEditor={this}
                        editor={this.props.editor}
                        ref={(r) => this.timelines = r!}
                        cinematic={this.props.cinematic}
                    />

                    <CinematicEditorInspector
                        cinematicEditor={this}
                        editor={this.props.editor}
                        ref={(r) => this.inspector = r!}
                    />
                </div>

                <CinematicRenderer
                    cinematicEditor={this}
                    editor={this.props.editor}
                    ref={(r) => this.cinematicRenderer = r!}
                />
            </div>
        );
    }

    public componentDidMount(): void {
        this._undoObserver = onUndoObservable.add(() => this.forceUpdate());
        this._redoObserver = onRedoObservable.add(() => this.forceUpdate());

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
        if (this._undoObserver) {
            onUndoObservable.remove(this._undoObserver);
        }

        if (this._redoObserver) {
            onRedoObservable.remove(this._redoObserver);
        }

        window.removeEventListener("keyup", this._onKeyUpListener);
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

    /**
     * Saves the current cinematic into the currently opened file.
     */
    public async save(): Promise<void> {
        const data = serializeCinematic(this.props.cinematic);

        await writeJSON(this.props.absolutePath, data, {
            spaces: "\t",
            encoding: "utf-8",
        });

        toast.success("Cinematic file saved.");
    }

    /**
     * Saves the current cinematic into a chosen file.
     */
    public async saveAs(): Promise<void> {
        const destination = saveSingleFileDialog({
            title: "Save Cinematic File",
            filters: [
                { name: "Cinematic Files", extensions: ["cinematic"] },
            ],
        });

        if (!destination) {
            return;
        }

        const data = serializeCinematic(this.props.cinematic);

        await writeJSON(destination, data, {
            spaces: "\t",
            encoding: "utf-8",
        });

        toast.success("Cinematic file saved.");
    }

    /**
     * Renders the current cinematic into a video file.
     * @param type defines the type of render to perform.
     */
    public renderCinematic(type: RenderType): void {
        this.cinematicRenderer.openRenderDialog(this.props.cinematic, type);
    }
}

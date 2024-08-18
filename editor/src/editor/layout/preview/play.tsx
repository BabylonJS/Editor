import { ipcRenderer, shell } from "electron";
import { dirname } from "path/posix";

import { Button } from "@blueprintjs/core";
import { Component, ReactNode } from "react";

import { Grid } from "react-loader-spinner";
import { IoPlay, IoStop } from "react-icons/io5";

import { exportProject } from "../../../project/export/export";
import { projectConfiguration } from "../../../project/configuration";

import { execNodePty, NodePtyInstance } from "../../../tools/node-pty";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../ui/shadcn/ui/tooltip";

import { Editor } from "../../main";

export interface IEditorPreviewPlayComponentProps {
    /**
     * The editor reference.
     */
    editor: Editor;
}

export interface IEditorPreviewPlayComponentState {
    /**
     * Defines wether or not the game / application is playing in the editor.
     */
    playing: boolean;
    /**
     * Defines the address of the game / application being played.
     */
    playingAddress: string;
    /**
     * Defines wether or not the player is being prepared.
     */
    preparingPlay: boolean;
}

export class EditorPreviewPlayComponent extends Component<IEditorPreviewPlayComponentProps, IEditorPreviewPlayComponentState> {
    private _playProcess: NodePtyInstance | null = null;

    public constructor(props: IEditorPreviewPlayComponentProps) {
        super(props);

        this.state = {
            playing: false,
            playingAddress: "",
            preparingPlay: false,
        };
    }

    public render(): ReactNode {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <Button
                            minimal
                            active={this.state.playing}
                            disabled={this.state.preparingPlay}
                            icon={
                                this.state.preparingPlay
                                    ? <Grid width={24} height={24} color="gray" />
                                    : this.state.playing
                                        ? <IoStop className="w-6 h-6" strokeWidth={1} color="red" />
                                        : <IoPlay className="w-6 h-6" strokeWidth={1} color="green" />
                            }
                            onClick={() => this.playOrStopApplication()}
                            className={`
                                            w-10 h-10 bg-muted/50 !rounded-lg
                                            ${this.state.preparingPlay
                                    ? "bg-muted/50"
                                    : this.state.playing
                                        ? "!bg-red-500/35"
                                        : "hover:!bg-green-500/35"
                                }
                                            transition-all duration-300 ease-in-out
                                        `}
                        />
                    </TooltipTrigger>
                    <TooltipContent>
                        Play the game / application
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    public componentDidMount(): void {
        ipcRenderer.once("editor:closed", () => {
            try {
                this._playProcess?.kill();
            } catch (e) {
                // Catch silently.
            }
        });
    }

    /**
     * Sets the game / application to play or stop.
     * If stopped, the process created to server the game / application keeps alive in order to be played again but faster than the first launch.
     */
    public async playOrStopApplication(): Promise<void> {
        if (!this.state.playing) {
            this.setState({ preparingPlay: true });

            await Promise.all([
                this._preparePlayProcess(),
                exportProject(this.props.editor, { optimize: false }),
            ]);

            this.setState({ preparingPlay: false });
        }

        this.setState({ playing: !this.state.playing }, () => {
            this.props.editor.layout.preview.forceUpdate();
        });
    }

    private async _preparePlayProcess(): Promise<void> {
        if (this._playProcess || !projectConfiguration.path) {
            return;
        }

        const log = await this.props.editor.layout.console.progress("Starting the game / application...");

        this._playProcess = await execNodePty("yarn dev", {
            cwd: dirname(projectConfiguration.path),
        });

        const localhostRegex = /http:\/\/localhost:(\d+)/;

        let playingAddress = "";

        this._playProcess.onGetDataObservable.add((data) => {
            if (!playingAddress) {
                const match = data.match(localhostRegex);
                if (match) {
                    playingAddress = `http://localhost:${match[1]}`;
                }
            }

            const readyIndex = data.indexOf("Ready");
            if (readyIndex !== -1 && playingAddress) {
                this.setState({ playingAddress }, () => {
                    this.props.editor.layout.preview.forceUpdate();
                });

                log.setState({
                    done: true,
                    message: (
                        <div>
                            Game / application is ready at <a className="underline underline-offset-4" onClick={() => shell.openExternal(playingAddress)}>{playingAddress}</a>
                        </div>
                    ),
                });

                this._playProcess?.onGetDataObservable.clear();
            }
        });
    }
}

import { dirname } from "path/posix";
import { ipcRenderer, shell } from "electron";

import { Button } from "@blueprintjs/core";
import { Component, ReactNode } from "react";

import { toast } from "sonner";

import { Grid } from "react-loader-spinner";

import { IoPlay, IoStop, IoRefresh } from "react-icons/io5";

import { exportProject } from "../../../project/export/export";
import { projectConfiguration } from "../../../project/configuration";

import { execNodePty, NodePtyInstance } from "../../../tools/node-pty";
import { checkPackageManagerAvailable, packageManagerAvailable } from "../../../tools/process";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../ui/shadcn/ui/tooltip";

import { Editor } from "../../main";

export interface IEditorPreviewPlayComponentProps {
    /**
     * The editor reference.
     */
    editor: Editor;

    /**
     * Called on the user wants to restart the game / application (aka. refresh the page of the game / application).
     */
    onRestart: () => void;
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

        ipcRenderer.on("preview:run-project", () => {
            if (this.state.playing) {
                this.props.onRestart();
            } else if (!this.state.preparingPlay) {
                this.playOrStopApplication();
            }
        });
    }

    public render(): ReactNode {
        return (
            <TooltipProvider>
                {this.state.playing && this.state.playingAddress && !this.state.preparingPlay &&
                    <Tooltip>
                        <TooltipTrigger>
                            <Button
                                minimal
                                onClick={() => this.props.onRestart()}
                                icon={<IoRefresh className="w-6 h-6" strokeWidth={1} color="red" />}
                                className="w-10 h-10 bg-muted/50 !rounded-lg transition-all duration-300 ease-in-out"

                            />
                        </TooltipTrigger>
                        <TooltipContent>
                            Restart the game / application
                        </TooltipContent>
                    </Tooltip>
                }

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
                                ${this.state.preparingPlay ? "bg-muted/50" : this.state.playing ? "!bg-red-500/35" : "hover:!bg-green-500/35"}
                                transition-all duration-300 ease-in-out
                            `}
                        />
                    </TooltipTrigger>
                    <TooltipContent className="flex gap-2 items-center">
                        Play the game / application
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
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

        await checkPackageManagerAvailable(this.props.editor.state.packageManager!);

        if (!packageManagerAvailable) {
            const message = `Package manager not available. Please install ${this.props.editor.state.packageManager} that is required by the project.`;

            log.setState({
                error: true,
                message: message,
            });

            this.setState({
                preparingPlay: false
            });

            toast.error(message);

            throw new Error(message);
        }

        let command = "";
        switch (this.props.editor.state.packageManager) {
            case "npm": command = "npm run dev"; break;
            case "pnpm": command = "pnpm dev"; break;
            case "bun": command = "bun run dev"; break;
            default: command = "yarn dev"; break;
        }

        this._playProcess = await execNodePty(command, {
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

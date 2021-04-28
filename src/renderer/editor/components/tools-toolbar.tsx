import * as React from "react";
import {
    ButtonGroup, Button, ContextMenu, Classes, Menu, MenuItem, MenuDivider,
    Tag, Intent, Spinner,
} from "@blueprintjs/core";

import { Editor } from "../editor";

import { Icon } from "../gui/icon";

import { EditorPlayMode } from "../tools/types";

import { ProjectExporter } from "../project/project-exporter";
import { WorkSpace } from "../project/workspace";

export interface IToolbarProps {
    /**
     * The editor reference.
     */
    editor: Editor;
}

export interface IToolbarState {
    /**
     * Defines wether or not project has a workspace loaded.
     */
    hasWorkspace: boolean;
    
    /**
     * Defines wether or not the user is playing the scene.
     */
    playing: {
        /**
         * Defines wether or not the user is playing.
         */
        isPlaying: boolean;
        /**
         * Defines wether or not the play is loading.
         */
        isLoading: boolean;
    };
}

export class ToolsToolbar extends React.Component<IToolbarProps, IToolbarState> {
    private _editor: Editor;

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IToolbarProps) {
        super(props);

        this._editor = props.editor;
        this._editor.toolsToolbar = this;

        this.state = {
            hasWorkspace: false,
            playing: {
                isPlaying: false,
                isLoading: false,
            }
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const playIcon = this.state.playing.isLoading ? (
            <Spinner size={20} />
        ) : (
            <Icon src={this.state.playing.isPlaying ? "square-full.svg" : "play.svg"} />
        );

        return (
            <div style={{ width: "100%" }}>
                <ButtonGroup large={false} style={{ marginTop: "auto", marginBottom: "auto" }}>
                    <Button disabled={!this.state.hasWorkspace} icon={<Icon src="play.svg"/>} rightIcon="caret-down" text="Run..." onContextMenu={(e) => this._handlePlayContextMenu(e)} onClick={() => this._buttonClicked("run-integrated")} id="play-game" />
                    <Button disabled={!this.state.hasWorkspace} icon={<Icon src="generate.svg"/>} rightIcon="caret-down" text="Generate..." onContextMenu={(e) => this._handleGenerateContextMenu(e)} onClick={() => this._buttonClicked("generate")} id="generate-scene" />
                </ButtonGroup>

                <ButtonGroup large={false} style={{ zIndex: 1, left: "50%", position: "absolute", transform: "translate(-50%)" }}>
                    <Button style={{ width: "50px" }} disabled={this.state.playing.isLoading} icon={playIcon} onClick={() => this._buttonClicked("play-scene")} />
                    <Button style={{ width: "50px" }} disabled={!this.state.playing.isPlaying || this.state.playing.isLoading} icon="reset" onClick={() => this._buttonClicked("restart-play-scene")} />
                </ButtonGroup>
            </div>
        );
    }

    /**
     * Called on a menu item is clicked.
     */
    private async _buttonClicked(id: string): Promise<void> {
        switch (id) {
            case "run": this._editor.runProject(EditorPlayMode.EditorPanelBrowser); break;
            case "run-integrated": this._editor.runProject(EditorPlayMode.IntegratedBrowser); break;
            case "run-my-browser": this._editor.runProject(EditorPlayMode.ExternalBrowser); break;
            case "run-editor": this._editor.runProject(EditorPlayMode.EditorPanelBrowser); break;

            case "generate": ProjectExporter.ExportFinalScene(this._editor); break;
            case "generate-final": ProjectExporter.ExportFinalScene(this._editor, undefined, { forceRegenerateFiles: true, generateAllCompressedTextureFormats: true }); break;
            case "generate-as": ProjectExporter.ExportFinalSceneAs(this._editor); break;
            case "generate-only-geometries": ProjectExporter.ExportFinalSceneOnlyGeometries(this._editor); break;
            case "build-project": WorkSpace.BuildProject(this._editor); break;

            case "play-scene": this._handlePlay(); break;
            case "restart-play-scene": this._handleRestart(); break;
            default: break;
        }
    }

    /**
     * Called on the user right-clicks on the "play" button.
     */
    private _handlePlayContextMenu(e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text="Run In Integrated Browser" onClick={() => this._buttonClicked("run-integrated")} />
                <MenuItem text="Run In My Browser" onClick={() => this._buttonClicked("run-my-browser")} />
                <MenuItem text="Run In Editor" onClick={() => this._buttonClicked("run-editor")} />
            </Menu>,
            { left: e.clientX, top: e.clientY },
        );
    }

    /**
     * Called on the user right-clicks on the "generate" button.
     */
    private _handleGenerateContextMenu(e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text={<div>Generate Scene... <Tag intent={Intent.PRIMARY}>(CTRL+g)</Tag></div>} onClick={() => this._buttonClicked("generate")} />
                <MenuItem text="Generate Final Scene..." onClick={() => this._buttonClicked("generate-final")} />
                <MenuDivider />
                <MenuItem text="Generate Scene As..." onClick={() => this._buttonClicked("generate-as")} />
                <MenuDivider />
                <MenuItem text="Generate Scene As (Only Geometries)..." onClick={() => this._buttonClicked("generate-only-geometries")} />
                <MenuDivider />
                <MenuItem text="Build Project..." onClick={() => this._buttonClicked("build-project")} />
            </Menu>,
            { left: e.clientX, top: e.clientY },
        );
    }

    /**
     * Called on the user wants to play or stop the test of the scene.
     */
    private async _handlePlay(): Promise<void> {
        const isPlaying = !this.state.playing.isPlaying;
        this.setState({ playing: { isPlaying, isLoading: true } });

        try {
            await this._editor.preview.playOrStop(false);
            this.setState({ playing: { ...this.state.playing, isLoading: false } });
        } catch (e) {
            this.setState({ playing: { isPlaying: false, isLoading: false } });
        }
    }

    /**
     * Called on the user wants to restart the scene being played in the editor.
     */
    private async _handleRestart(): Promise<void> {
        this.setState({ playing: { ...this.state.playing, isLoading: true } });
        await this._editor.preview.restartPlay();
        this.setState({ playing: { ...this.state.playing, isLoading: false } });
    }
}

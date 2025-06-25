import { remove } from "fs-extra";

import { Component, ReactNode } from "react";

import { Grid } from "react-loader-spinner";

import { generateCinematicAnimationGroup } from "babylonjs-editor-tools";

import { saveSingleFileDialog } from "../../../../tools/dialog";

import { Button } from "../../../../ui/shadcn/ui/button";
import { Progress } from "../../../../ui/shadcn/ui/progress";

import { CinematicEditor } from "../editor";

import { convertCinematicVideoToMp4 } from "./convert";
import { renderCinematic, RenderCinematicBaseOptionsType, RenderCinematicOptionsType } from "./render";

export interface ICinematicEditorRendererProps {
    cinematicEditor: CinematicEditor;
}

export interface ICinematicEditorRendererState {
    progress: number;
    rendering: boolean;
}

export class CinematicEditorRenderer extends Component<ICinematicEditorRendererProps, ICinematicEditorRendererState> {
	private _renderConfiguration: RenderCinematicOptionsType | null = null;

	public constructor(props: ICinematicEditorRendererProps) {
		super(props);

		this.state = {
			progress: 0,
			rendering: false,
		};
	}

	public render(): ReactNode {
		return (
			<div
				className={`
                    flex flex-col justify-center items-center gap-5
                    fixed top-0 left-0 w-full h-full z-50
                    ${this.state.rendering
				? "opacity-100 bg-black/50 backdrop-blur-sm"
				: "opacity-0 bg-transparent backdrop-blur-none pointer-events-none"
			}
                    transition-all duration-300 ease-in-out
                `}
			>
				<Grid width={64} height={64} color="gray" />

				<div>
					{this.state.rendering && "Rendering cinematic..."}
				</div>

				<div className="w-64">
					<Progress value={this.state.progress} />
				</div>

				<Button onClick={() => this._renderConfiguration!.cancelled = true}>
                    Cancel
				</Button>
			</div>
		);
	}

	public async renderCinematic(options: RenderCinematicBaseOptionsType): Promise<void> {
		const destination = saveSingleFileDialog({
			title: "Save cinematic video as...",
			filters: [
				{ name: "Mpeg-4 Video", extensions: ["mp4"] },
			],
		});

		if (!destination) {
			return;
		}

		const currentTimeBeforeRender = this.props.cinematicEditor.timelines.state.currentTime;

		const animationGroup = generateCinematicAnimationGroup(
			this.props.cinematicEditor.cinematic,
            this.props.cinematicEditor.editor.layout.preview.scene as any,
            {
            	ignoreSounds: true, // Ignore sounds during rendering
            }
		) as any;

		if (options.from >= options.to || options.to <= options.from) {
			options.from = animationGroup.from;
			options.to = animationGroup.to;
		}

		animationGroup.from = options.from;
		animationGroup.to = options.to;

		this.setState({
			progress: 0,
			rendering: true,
		});

		this._renderConfiguration = {
			...options,
			destination,
			animationGroup,
			cancelled: false,
			onProgress: (progress) => this.setState({ progress }),
		};

		const result = await renderCinematic(this.props.cinematicEditor, this._renderConfiguration);

		animationGroup.stop();
		animationGroup.dispose();

		if (!this._renderConfiguration.cancelled) {
			convertCinematicVideoToMp4({
				absolutePath: destination,
				framesCount: result.framesCount,
				folderAbsolutePath: result.destinationFolder,
				editor: this.props.cinematicEditor.editor,
				framesPerSecond: this.props.cinematicEditor.cinematic.outputFramesPerSecond,
			}).catch(() => {
				this.props.cinematicEditor.editor.layout.console.error(`Failed to convert cinematic video at: ${destination.replace(".webm", ".mp4")}`);
			}).finally(() => {
				remove(result.destinationFolder);
			});
		} else {
			remove(result.destinationFolder);
		}

		this.props.cinematicEditor.timelines.setCurrentTime(currentTimeBeforeRender);
		this.props.cinematicEditor.disposeTemporaryAnimationGroup();

		this.setState({
			progress: 0,
			rendering: false,
		});
	}
}

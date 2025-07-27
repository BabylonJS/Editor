import { Grid } from "react-loader-spinner";
import { Component, ReactNode } from "react";

import { Button } from "../../../ui/shadcn/ui/button";
import { Progress } from "../../../ui/shadcn/ui/progress";

import { CancellationToken } from "../../../tools/tools";
import { generateLightmaps, LightmapGenerationQuality } from "../../../tools/light/lightmap/generate";

import { Editor } from "../../main";

export interface IEditorPreviewLightmapGeneratorProps {
	editor: Editor;
}

export interface IEditorPreviewLightmapGeneratorState {
	generating: boolean;

	step: string;
	progress: number;

	logs: string;
}

export class EditorPreviewLightmapGenerator extends Component<IEditorPreviewLightmapGeneratorProps, IEditorPreviewLightmapGeneratorState> {
	private _logsDiv: HTMLDivElement | null = null;
	private _cancellationToken: CancellationToken | null = null;

	public constructor(props: IEditorPreviewLightmapGeneratorProps) {
		super(props);

		this.state = {
			step: "",
			logs: "",
			progress: 0,
			generating: false,
		};
	}

	public render(): ReactNode {
		return (
			<div
				className={`
			    	flex flex-col justify-center items-center gap-5
                    fixed top-0 left-0 w-full h-full z-[9999]
                    ${this.state.generating ? "opacity-100 bg-black/50 backdrop-blur-sm" : "opacity-0 bg-transparent backdrop-blur-none pointer-events-none"}
                    transition-all duration-300 ease-in-out
				`}
			>
				<Grid width={64} height={64} color="gray" />

				<div>{this.state.generating && this.state.step}</div>

				<div className="w-64">
					<Progress value={this.state.progress * 100} />
				</div>

				<Button disabled={this._cancellationToken?.isCancelled} onClick={() => this._handleCancel()}>
					Cancel
				</Button>

				<div ref={(div) => (this._logsDiv = div)} className="w-[50vw] h-[25vh] bg-background/85 rounded-lg p-5 whitespace-break-spaces backdrop-blur-xl overflow-y-auto">
					{this.state.logs}
				</div>
			</div>
		);
	}

	public async generate(quality: LightmapGenerationQuality): Promise<void> {
		this.setState({
			generating: true,
			step: "Preparing...",
		});

		this.props.editor.layout.preview.setRenderScene(false);

		this._cancellationToken = new CancellationToken();

		await generateLightmaps(this.props.editor, {
			quality,
			cancellationToken: this._cancellationToken,
			onProgress: (step, progress) => {
				this.setState({
					step,
					progress,
				});
			},
			onGetLog: (log) => {
				const limit = this._logsDiv!.scrollHeight - this._logsDiv!.clientHeight - 10;
				const isAtBottom = this._logsDiv!.scrollTop >= limit;

				this.setState({ logs: this.state.logs + log }, () => {
					if (isAtBottom) {
						this._logsDiv!.scrollTo(0, this._logsDiv!.scrollHeight);
					}
				});
			},
		});

		this._cancellationToken = null;

		this.props.editor.layout.graph.refresh();
		this.props.editor.layout.preview.setRenderScene(true);

		this.setState({
			logs: "",
			progress: 0,
			generating: false,
		});
	}

	private _handleCancel(): void {
		this._cancellationToken?.cancel();
		this.forceUpdate();
	}
}

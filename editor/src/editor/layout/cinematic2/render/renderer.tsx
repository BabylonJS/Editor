import { Component, ReactNode } from "react";

import { Grid } from "react-loader-spinner";

import { generateCinematicAnimationGroup } from "babylonjs-editor-tools";

import { saveSingleFileDialog } from "../../../../tools/dialog";

import { Button } from "../../../../ui/shadcn/ui/button";
import { Progress } from "../../../../ui/shadcn/ui/progress";

import { CinematicEditor } from "../editor";

export type RenderType = "720p" | "1080p" | "4k";

export type RenderCinematicOptionsType = {
    from: number;
    to: number;
    type: RenderType;
};

export interface ICinematicEditorRendererProps {
    cinematicEditor: CinematicEditor;
}

export interface ICinematicEditorRendererState {
    progress: number;
    step: "rendering" | "converting" | "void";
}

export class CinematicEditorRenderer extends Component<ICinematicEditorRendererProps, ICinematicEditorRendererState> {
    public constructor(props: ICinematicEditorRendererProps) {
        super(props);

        this.state = {
            progress: 0,
            step: "void",
        };
    }

    public render(): ReactNode {
        return (
            <div
                className={`
                    flex flex-col justify-center items-center gap-5
                    fixed top-0 left-0 w-full h-full z-50
                    ${this.state.step !== "void"
                        ? "opacity-100 bg-black/50 backdrop-blur-sm"
                        : "opacity-0 bg-transparent backdrop-blur-none pointer-events-none"
                    }
                    transition-all duration-300 ease-in-out
                `}
            >
                <Grid width={64} height={64} color="gray" />

                <div>
                    {this.state.step === "rendering" && "Rendering cinematic..."}
                </div>

                <div className="w-64">
                    <Progress value={this.state.progress} />
                </div>

                <Button onClick={() => this.setState({ step: "void" })}>
                    Cancel
                </Button>
            </div>
        );
    }

    public async renderCinematic(options: RenderCinematicOptionsType): Promise<void> {
        const destination = saveSingleFileDialog({
            title: "Save cinematic video as...",
            filters: [
                { name: "Mpeg-4 Video", extensions: ["mp4"] },
            ],
        });

        if (!destination) {
            return;
        }

        const animationGroup = generateCinematicAnimationGroup(
            this.props.cinematicEditor.cinematic,
            this.props.cinematicEditor.editor.layout.preview.scene as any,
        ) as any;

        if (options.from >= options.to || options.to <= options.from) {
            options.from = animationGroup.from;
            options.to = animationGroup.to;
        }

        animationGroup.from = options.from;
        animationGroup.to = options.to;

        this.setState({
            progress: 0,
            step: "rendering",
        });
    }
}

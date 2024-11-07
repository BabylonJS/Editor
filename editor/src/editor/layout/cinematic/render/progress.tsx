import { Component, ReactNode } from "react";

import { Grid } from "react-loader-spinner";

import { Button } from "../../../../ui/shadcn/ui/button";
import { Progress } from "../../../../ui/shadcn/ui/progress";

export interface ICinematicConvertProgressComponentProps {
    onCancel: () => void;
}

export interface IEditorExportProjectProgressComponentState {
    progress: number;
}

export class CinematicConvertProgressComponent extends Component<ICinematicConvertProgressComponentProps, IEditorExportProjectProgressComponentState> {
    public constructor(props: ICinematicConvertProgressComponentProps) {
        super(props);

        this.state = {
            progress: 0,
        };
    }

    public render(): ReactNode {
        return (
            <div className="flex gap-5 items-center w-full">
                <Grid width={24} height={24} color="gray" />

                <div className="flex flex-col gap-2 w-full">
                    <div className="flex gap-5 items-center justify-between text-lg font-[400]">
                        Converting mp4...
                        <Button variant="ghost" onClick={() => this.props.onCancel()}>
                            Cancel
                        </Button>
                    </div>
                    <Progress value={this.state.progress} />
                </div>
            </div>
        );
    }

    public setProgress(progress: number): void {
        this.setState({ progress });
    }
}

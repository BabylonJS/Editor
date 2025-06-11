import { basename } from "path/posix";

import { Component, ReactNode } from "react";

import { Progress } from "../../../../ui/shadcn/ui/progress";

export interface IEditorPreviewConvertProgressProps {
    absolutePath: string;
}

export interface IEditorPreviewConvertProgressState {
    value: number;
}

export class EditorPreviewConvertProgress extends Component<IEditorPreviewConvertProgressProps, IEditorPreviewConvertProgressState> {
    public constructor(props: IEditorPreviewConvertProgressProps) {
        super(props);

        this.state = {
            value: 0,
        };
    }

    public render(): ReactNode {
        return (
            <div className="flex flex-col gap-2">
                <div>
                    Converting scene {basename(this.props.absolutePath)}...
                </div>
                <Progress value={this.state.value} />
            </div>
        );
    }
}

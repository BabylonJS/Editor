import { Component, ReactNode } from "react";

import { Grid } from "react-loader-spinner";

export interface IEditorExportProjectProgressComponentState {
    progress: number;
}

export class EditorSaveProjectProgressComponent extends Component<{}, IEditorExportProjectProgressComponentState> {
    private _step: number = 0;

    public constructor(props: {}) {
        super(props);

        this.state = {
            progress: 0,
        };
    }

    public render(): ReactNode {
        return (
            <div className="flex gap-5 items-center w-full">
                <Grid width={24} height={24} color="gray" />

                <div className="text-lg font-[400]">
                    Saving...
                </div>
            </div>
        );
    }

    public step(step: number): void {
        this._step += step;
        this.setState({ progress: this._step });
    }
}

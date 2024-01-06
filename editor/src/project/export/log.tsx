import { Component, ReactNode } from "react";

import { Grid } from "react-loader-spinner";
import { FaCheckCircle } from "react-icons/fa";

export interface IEditorExportConsoleComponentProps {
    message: string;
}

export interface IEditorExportConsoleComponentState {
    done: boolean;
    error: boolean;

    message: string;
}

export class EditorExportConsoleComponent extends Component<IEditorExportConsoleComponentProps, IEditorExportConsoleComponentState> {
    public constructor(props: IEditorExportConsoleComponentProps) {
        super(props);

        this.state = {
            done: false,
            error: false,

            message: props.message,
        };
    }

    public render(): ReactNode {
        return (
            <div className={`flex items-center gap-[5px] ${this.state.error ? "text-red-500" : ""}`}>
                {!this.state.done &&
                    <Grid width={14} height={14} color="#ffffff" />
                }

                {this.state.done &&
                    <FaCheckCircle className="w-[14px] h-[14px]" />
                }

                <div className="whitespace-nowrap">
                    {this.state.message}
                </div>
            </div>
        );
    }
}

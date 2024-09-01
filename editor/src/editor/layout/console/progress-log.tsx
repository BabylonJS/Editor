import { Component, ReactNode } from "react";

import { Grid } from "react-loader-spinner";
import { FaCheckCircle } from "react-icons/fa";

import { Editor } from "../../main";

export interface IEditorConsoleProgressLogComponentProps {
    message: ReactNode;
}

export interface IEditorConsoleProgressLogComponentState {
    done: boolean;
    error: boolean;

    message: ReactNode;
}

export class EditorConsoleProgressLogComponent extends Component<IEditorConsoleProgressLogComponentProps, IEditorConsoleProgressLogComponentState> {
    /**
     * Creates a new progress log.
     * @param editor defines the reference to the editor to create the log.
     * @param message defines the message to display for the progress.
     * @returns the reference to the mounted progress log component instance.
     */
    public static Create(editor: Editor, message: ReactNode): Promise<EditorConsoleProgressLogComponent> {
        return new Promise<EditorConsoleProgressLogComponent>((resolve) => {
            editor.layout.console.log((
                <EditorConsoleProgressLogComponent
                    message={message}
                    ref={(r) => r && resolve(r)}
                />
            ));
        });
    }

    public constructor(props: IEditorConsoleProgressLogComponentProps) {
        super(props);

        this.state = {
            done: false,
            error: false,

            message: props.message,
        };
    }

    public render(): ReactNode {
        return (
            <div className={`flex items-center gap-[5px] ${this.state.error ? "text-red-500" : ""} hover:bg-secondary/50 hover:py-1 transition-all duration-300 ease-in-out`}>
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

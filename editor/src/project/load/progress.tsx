import { Component, ReactNode } from "react";
import { Root, createRoot } from "react-dom/client";

import { Progress } from "../../ui/shadcn/ui/progress";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../ui/shadcn/ui/alert-dialog";

export function showLoadSceneProgressDialog(): Promise<LoadSceneProgressComponent> {
    return new Promise<LoadSceneProgressComponent>((resolve) => {
        const div = document.createElement("div");
        document.body.appendChild(div);

        const root = createRoot(div);
        root.render(<LoadSceneProgressComponent ref={(r) => r && resolve(r)} root={root} container={div} />);
    });
}

export interface ILoadSceneProgressComponentProps {
    root: Root;
    container: HTMLDivElement;
}

export interface ILoadSceneProgressComponentState {
    progress: number;
}

export class LoadSceneProgressComponent extends Component<ILoadSceneProgressComponentProps, ILoadSceneProgressComponentState> {
    private _step: number = 0;

    public constructor(props: ILoadSceneProgressComponentProps) {
        super(props);

        this.state = {
            progress: 0,
        };
    }

    public render(): ReactNode {
        return (
            <AlertDialog open>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Loading...
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            <Progress value={this.state.progress} />
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    public step(step: number): void {
        this._step += step;
        this.setState({ progress: this._step });
    }

    public dispose(): void {
        this.props.root.unmount();
        document.body.removeChild(this.props.container);
    }
}

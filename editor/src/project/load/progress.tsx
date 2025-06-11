import { Component, ReactNode } from "react";
import { Root, createRoot } from "react-dom/client";

import { Progress } from "../../ui/shadcn/ui/progress";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../ui/shadcn/ui/alert-dialog";

export function showLoadSceneProgressDialog(name: string): Promise<LoadSceneProgressComponent> {
    return new Promise<LoadSceneProgressComponent>((resolve) => {
        const div = document.createElement("div");
        document.body.appendChild(div);

        const root = createRoot(div);
        root.render(<LoadSceneProgressComponent name={name} ref={(r) => r && resolve(r)} root={root} container={div} />);
    });
}

export interface ILoadSceneProgressComponentProps {
    name: string;
    root: Root;
    container: HTMLDivElement;
}

export interface ILoadSceneProgressComponentState {
    name: string;
    progress: number;
}

export class LoadSceneProgressComponent extends Component<ILoadSceneProgressComponentProps, ILoadSceneProgressComponentState> {
    private _step: number = 0;

    public constructor(props: ILoadSceneProgressComponentProps) {
        super(props);

        this.state = {
            progress: 0,
            name: props.name,
        };
    }

    public render(): ReactNode {
        return (
            <AlertDialog open>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {this.state.name}...
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
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

    public setName(name: string): void {
        this.setState({ name });
    }

    public dispose(): void {
        this.props.root.unmount();
        document.body.removeChild(this.props.container);
    }
}

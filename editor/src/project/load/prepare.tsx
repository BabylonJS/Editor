import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

import { Component, ReactNode } from "react";
import { Root, createRoot } from "react-dom/client";

import { Grid } from "react-loader-spinner";

import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../ui/shadcn/ui/alert-dialog";

export function showLoadScenePrepareDialog(): Promise<LoadScenePrepareComponent> {
    return new Promise<LoadScenePrepareComponent>((resolve) => {
        const div = document.createElement("div");
        document.body.appendChild(div);

        const root = createRoot(div);
        root.render(<LoadScenePrepareComponent ref={(r) => r && resolve(r)} root={root} container={div} />);
    });
}

export interface ILoadSceneProgressComponentProps {
    root: Root;
    container: HTMLDivElement;
}

export class LoadScenePrepareComponent extends Component<ILoadSceneProgressComponentProps> {
    private _terminal: Terminal | null = null;
    private _terminalDiv: HTMLDivElement | null = null;

    public constructor(props: ILoadSceneProgressComponentProps) {
        super(props);

        this.state = {
            step: "",
            command: "",
        };
    }

    public render(): ReactNode {
        return (
            <AlertDialog open>
                <AlertDialogContent className="w-[75vw] h-[75vh] max-w-full">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-[10px]">
                            <Grid width={16} height={16} color="gray" />
                            <div className="text-foreground">
                                Loading...
                            </div>
                        </AlertDialogTitle>
                        <AlertDialogDescription className="flex gap-[10px] pt-5">
                            <div ref={(r) => this._terminalDiv = r} className="w-full h-full p-5 overflow-hidden" />
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    public componentDidMount(): void {
        if (!this._terminalDiv) {
            return;
        }

        this._terminal = new Terminal({
            cols: 80,
            fontSize: 12,
            lineHeight: 1,
            cursorWidth: 1,
            letterSpacing: -3,
            cursorStyle: "block",
            allowTransparency: false,
            drawBoldTextInBrightColors: false,
            fontFamily: "'Inter', sans-serif",
            theme: {
                background: "transparent",
            },
        });

        this._terminal.open(this._terminalDiv);

        const fitAddon = new FitAddon();
        fitAddon.activate(this._terminal);
    }

    public componentWillUnmount(): void {
        this._terminal?.dispose();
    }

    public writeCommandData(data: string): void {
        this._terminal?.write(data);
    }

    public dispose(): void {
        this.props.root.unmount();
        document.body.removeChild(this.props.container);
    }
}

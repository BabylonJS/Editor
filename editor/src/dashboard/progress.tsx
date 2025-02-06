import { Component, ReactNode } from "react";

import { Grid } from "react-loader-spinner";

import { MdOutlineInfo } from "react-icons/md";

import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

import { isDarwin } from "../tools/os";
import { NodePtyInstance } from "../tools/node-pty";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/shadcn/ui/tooltip";

export interface IDashboardProgressComponentProps {
    name: string;
}

export interface IDashboardProgressComponentState {
    message: ReactNode;
}

export class DashboardProgressComponent extends Component<IDashboardProgressComponentProps, IDashboardProgressComponentState> {
    private _terminal: Terminal | null = null;
    private _fitAddon: FitAddon | null = null;
    private _terminalData: string = "";

    public constructor(props: IDashboardProgressComponentProps) {
        super(props);

        this.state = {
            message: "",
        };
    }

    public render(): ReactNode {
        return (
            <div className="flex gap-5 items-center w-full h-12">
                <Grid width={24} height={24} color="gray" />

                <div className="flex flex-col flex-1">
                    <div className="text-xl font-[400]">
                        {this.props.name}
                    </div>
                    <div className="font-[400] text-muted-foreground">
                        {this.state.message}
                    </div>
                </div>

                <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger>
                            <MdOutlineInfo size={24} />
                        </TooltipTrigger>
                        <TooltipContent
                            align="end"
                            side="top"
                            collisionPadding={8}
                            className="bg-secondary text-muted-foreground text-sm rounded-lg p-2 mb-10 ring-2 ring-muted-foreground overflow-hidden"
                        >
                            <div
                                ref={(r) => this._onTerminalDivChanged(r)}
                                className="w-[720px] h-[320px] overflow-hidden"
                            />
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        );
    }

    private _onTerminalDivChanged(ref: HTMLDivElement | null): void {
        if (!ref) {
            this._fitAddon?.dispose();
            this._fitAddon = null;

            this._terminal?.dispose();
            this._terminal = null;
        } else if (!this._terminal) {
            this._terminal = new Terminal({
                fontSize: 12,
                lineHeight: 1,
                fontWeight: "400",
                fontWeightBold: "600",
                allowTransparency: true,
                letterSpacing: isDarwin() ? -6 : 0,
                fontFamily: "'Inter var', sans-serif",
                windowOptions: {
                    getWinSizePixels: true,
                    getCellSizePixels: true,
                    getWinSizeChars: true,
                },
            });

            this._fitAddon = new FitAddon();
            this._terminal.loadAddon(this._fitAddon);

            this._terminal.open(ref);

            requestAnimationFrame(() => {
                this._fitAddon?.fit();
            });

            this._terminal!.write(this._terminalData);
        }
    }

    public setProcess(process: NodePtyInstance): void {
        process.onGetDataObservable.add((data) => {
            this._terminalData += data;

            if (this._terminal) {
                requestAnimationFrame(() => {
                    this._fitAddon?.fit();

                    if (this._terminal) {
                        process.resize(this._terminal.cols, this._terminal.rows);
                    }
                });

                this._terminal.write(data);
            }
        });
    }
}

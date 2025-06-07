import { Component, MouseEvent, ReactNode } from "react";

import { waitNextAnimationFrame } from "../../../../tools/tools";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";

export interface IEditorAnimationTrackerProps {
    width: number;
    scale: number;
    currentTime: number;

    onTimeChange: (currentTime: number) => void;
}

export interface IEditorAnimationTrackerState {
    moving: boolean;
}

export class EditorAnimationTracker extends Component<IEditorAnimationTrackerProps, IEditorAnimationTrackerState> {
    public constructor(props: IEditorAnimationTrackerProps) {
        super(props);

        this.state = {
            moving: false,
        };
    }

    public render(): ReactNode {
        return (
            <TooltipProvider>
                <div
                    style={{
                        width: `${this.props.width}px`,
                    }}
                    className="relative h-10 min-w-full pointer-events-none"
                    onClick={(ev) => this._handleClick(ev)}
                >
                    <Tooltip delayDuration={0} open={this.state.moving}>
                        <TooltipTrigger
                            style={{
                                left: `${this.props.currentTime * this.props.scale}px`,
                            }}
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-auto"
                        >
                            <div
                                onMouseDown={(ev) => this._handlePointerDown(ev)}
                                style={{
                                    mask: "linear-gradient(135deg, transparent 0%, transparent 50%, black 50%, black 100%)",
                                }}
                                className="w-7 h-7 rotate-45 bg-accent cursor-pointer hover:scale-125 transition-transform duration-300 ease-in-out"
                            />
                        </TooltipTrigger>
                        <TooltipContent>
                            {this._getTooltipContent()}
                        </TooltipContent>
                    </Tooltip>
                </div>
            </TooltipProvider>
        );
    }

    private _handleClick(ev: MouseEvent<HTMLDivElement, globalThis.MouseEvent>): void {
        if (!this.state.moving) {
            const currentTime = Math.round(
                Math.max(0, ev.nativeEvent.offsetX / this.props.scale),
            );

            this.props.onTimeChange(currentTime);
        }
    }

    private _handlePointerDown(ev: MouseEvent<HTMLDivElement, globalThis.MouseEvent>): void {
        ev.stopPropagation();

        if (ev.button !== 0) {
            return;
        }

        this.setState({ moving: true });

        document.body.style.cursor = "ew-resize";

        let mouseUpListener: (event: globalThis.MouseEvent) => void;
        let mouseMoveListener: (event: globalThis.MouseEvent) => void;

        let clientX: number | null = null;

        const startPosition = this.props.currentTime;

        document.body.addEventListener("mousemove", mouseMoveListener = (ev) => {
            if (clientX === null) {
                clientX = ev.clientX;
            }

            const delta = clientX - ev.clientX;

            const currentTime = Math.round(
                Math.max(0, startPosition - delta / this.props.scale),
            );

            this.props.onTimeChange(currentTime);
        });

        document.body.addEventListener("mouseup", mouseUpListener = (ev) => {
            ev.stopPropagation();

            document.body.style.cursor = "auto";

            document.body.removeEventListener("mouseup", mouseUpListener);
            document.body.removeEventListener("mousemove", mouseMoveListener);

            waitNextAnimationFrame().then(() => {
                this.setState({ moving: false });
            });
        });
    }

    private _getTooltipContent(): ReactNode {
        const seconds = this.props.currentTime / 60;
        const minutes = Math.floor(seconds / 60);

        return (
            <div className="flex flex-col gap-2 justify-center items-center p-2">
                <div className="font-semibold text-primary-foreground">
                    {this.props.currentTime}
                </div>
                <div className="flex gap-1 items-center text-primary-foreground">
                    {minutes >= 1 &&
                        <>
                            {minutes >> 0}min
                        </>
                    }
                    {(seconds - minutes * 60).toFixed(1)}s
                </div>
            </div>
        );
    }
}

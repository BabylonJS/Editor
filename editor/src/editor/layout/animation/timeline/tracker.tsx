import { Component, MouseEvent, ReactNode } from "react";

import { waitNextAnimationFrame } from "../../../../tools/tools";

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
            <div
                style={{
                    width: `${this.props.width}px`,
                }}
                className="relative h-10 min-w-full"
                onClick={(ev) => this._handleClick(ev)}
            >
                <div
                    onMouseDown={(ev) => this._handlePointerDown(ev)}
                    style={{
                        left: `${this.props.currentTime * this.props.scale}px`,
                        mask: "linear-gradient(135deg, transparent 0%, transparent 50%, black 50%, black 100%)",
                    }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rotate-45 bg-accent cursor-pointer hover:scale-125 transition-transform duration-300 ease-in-out"
                />
            </div>
        );
    }

    private _handleClick(ev: MouseEvent<HTMLDivElement, globalThis.MouseEvent>): void {
        if (!this.state.moving) {
            this.props.onTimeChange(Math.max(0, ev.nativeEvent.offsetX / this.props.scale));
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

            this.props.onTimeChange(Math.max(0, startPosition - delta / this.props.scale));
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
}

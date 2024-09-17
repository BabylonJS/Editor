import { Component, ReactNode } from "react";

import { IAnimationKey } from "babylonjs";

import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";

export interface IEditorAnimationTimelineKeyProps {
    scale: number;
    animationKey: IAnimationKey;

    onAnimationKeyMoved: (key: IAnimationKey) => void;
}

export interface IEditorAnimationTimelineKeyState {
    tooltipOpen: boolean | undefined;
}

export class EditorAnimationTimelineKey extends Component<IEditorAnimationTimelineKeyProps, IEditorAnimationTimelineKeyState> {
    public constructor(props: IEditorAnimationTimelineKeyProps) {
        super(props);

        this.state = {
            tooltipOpen: undefined,
        };
    }

    public render(): ReactNode {
        return (
            <Tooltip delayDuration={0} open={this.state.tooltipOpen}>
                <TooltipTrigger
                    style={{
                        left: `${this.props.animationKey.frame * this.props.scale}px`,
                    }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                >
                    <div
                        onMouseDown={() => this._handlePointerDown()}
                        className="w-4 h-4 rotate-45 bg-muted-foreground hover:scale-125 transition-transform duration-300 ease-in-out"
                    />
                </TooltipTrigger>
                <TooltipContent>
                    {this.props.animationKey.frame}
                </TooltipContent>
            </Tooltip>
        );
    }

    private _handlePointerDown(): void {
        this.setState({ tooltipOpen: true });

        document.body.style.cursor = "ew-resize";

        let mouseUpListener: () => void;
        let mouseMoveListener: (event: MouseEvent) => void;

        let clientX: number | null = null;

        const startPosition = this.props.animationKey.frame;

        document.body.addEventListener("mousemove", mouseMoveListener = (ev) => {
            if (clientX === null) {
                clientX = ev.clientX;
            }

            const delta = clientX - ev.clientX;

            this.props.animationKey.frame = Math.round(
                Math.max(0, startPosition - delta / this.props.scale),
            );

            this.forceUpdate();
        });

        document.body.addEventListener("mouseup", mouseUpListener = () => {
            document.body.style.cursor = "auto";

            document.body.removeEventListener("mouseup", mouseUpListener);
            document.body.removeEventListener("mousemove", mouseMoveListener);

            this.setState({ tooltipOpen: undefined });

            this.props.onAnimationKeyMoved(this.props.animationKey);
        });
    }
}

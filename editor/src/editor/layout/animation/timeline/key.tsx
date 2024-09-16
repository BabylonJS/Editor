import { Component, ReactNode } from "react";

import { IAnimationKey } from "babylonjs";

import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";

export interface IEditorAnimationTimelineKeyProps {
    scale: number;
    animationKey: IAnimationKey;
}

export interface IEditorAnimationTimelineKeyState {
    pointerDown: boolean;
}

export class EditorAnimationTimelineKey extends Component<IEditorAnimationTimelineKeyProps, IEditorAnimationTimelineKeyState> {
    public constructor(props: IEditorAnimationTimelineKeyProps) {
        super(props);

        this.state = {
            pointerDown: false,
        };
    }

    public render(): ReactNode {
        return (
            <Tooltip delayDuration={0}>
                <TooltipTrigger
                    style={{
                        marginLeft: `${this.props.animationKey.frame * this.props.scale}%`,
                    }}
                >
                    <div
                        className={`
                            w-4 h-4 rotate-45 bg-secondary
                            ${this.state.pointerDown ? "cursor-ew-resize" : ""}
                        `}
                        onMouseDown={() => this._handlePointerDown()}
                    />
                </TooltipTrigger>
                <TooltipContent>
                    {this.props.animationKey.frame}
                </TooltipContent>
            </Tooltip>
        );
    }

    private _handlePointerDown(): void {
        this.setState({ pointerDown: true });

        document.body.style.cursor = "ew-resize";

        let mouseUpListener: () => void;
        let mouseMoveListener: (event: MouseEvent) => void;

        let clientX: number | null = null;

        document.body.addEventListener("mousemove", mouseMoveListener = (ev) => {
            if (clientX === null) {
                clientX = ev.clientX;
            }

            const delta = ev.clientX - clientX;
            console.log(delta);
        });

        document.body.addEventListener("mouseup", mouseUpListener = () => {
            document.body.style.cursor = "auto";

            document.body.removeEventListener("mouseup", mouseUpListener);
            document.body.removeEventListener("mousemove", mouseMoveListener);
        });
    }
}

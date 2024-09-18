import { AiOutlineClose } from "react-icons/ai";
import { Component, MouseEvent, ReactNode } from "react";

import { IAnimationKey } from "babylonjs";

import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../../../../ui/shadcn/ui/context-menu";

export interface IEditorAnimationTimelineKeyProps {
    scale: number;
    animationKey: IAnimationKey;

    onRemoved: (key: IAnimationKey) => void;
    onMoved: (key: IAnimationKey, newFrame: number, oldFrame: number) => void;
}

export interface IEditorAnimationTimelineKeyState {
    moving: boolean | undefined;
}

export class EditorAnimationTimelineKey extends Component<IEditorAnimationTimelineKeyProps, IEditorAnimationTimelineKeyState> {
    public constructor(props: IEditorAnimationTimelineKeyProps) {
        super(props);

        this.state = {
            moving: undefined,
        };
    }

    public render(): ReactNode {
        return (
            <Tooltip delayDuration={0} open={this.state.moving}>
                <TooltipTrigger
                    style={{
                        left: `${this.props.animationKey.frame * this.props.scale}px`,
                    }}
                    className={`
                        absolute top-1/2 -translate-y-1/2 -translate-x-1/2
                        ${this.state.moving ? "" : "transition-all duration-150 ease-in-out"}
                    `}
                >
                    <ContextMenu>
                        <ContextMenuTrigger>
                            <div
                                onMouseDown={(ev) => this._handlePointerDown(ev)}
                                className="w-4 h-4 rotate-45 bg-muted-foreground hover:scale-125 transition-transform duration-300 ease-in-out"
                            />
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            <ContextMenuItem
                                className="flex items-center gap-2 !text-red-400"
                                onClick={() => this.props.onRemoved(this.props.animationKey)}
                            >
                                <AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> Remove
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                </TooltipTrigger>
                <TooltipContent>
                    {this.props.animationKey.frame}
                </TooltipContent>
            </Tooltip>
        );
    }

    private _handlePointerDown(ev: MouseEvent<HTMLDivElement, globalThis.MouseEvent>): void {
        if (ev.button !== 0) {
            return;
        }

        this.setState({ moving: true });

        document.body.style.cursor = "ew-resize";

        let mouseUpListener: () => void;
        let mouseMoveListener: (event: globalThis.MouseEvent) => void;

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

            this.setState({ moving: undefined });

            this.props.onMoved(this.props.animationKey, this.props.animationKey.frame, startPosition);
        });
    }
}

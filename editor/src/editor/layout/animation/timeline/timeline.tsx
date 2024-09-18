import { Component, ReactNode } from "react";
import { AiOutlinePlus } from "react-icons/ai";

import { Animation, IAnimatable } from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";

import { EditorAnimation } from "../../animation";

import { EditorAnimationTimelineItem } from "./track";

export interface IEditorAnimationTimelinePanelProps {
    animatable: IAnimatable | null;
    animationEditor: EditorAnimation;
}

export interface IEditorAnimationTimelinePanelState {
    scale: number;
}

export class EditorAnimationTimelinePanel extends Component<IEditorAnimationTimelinePanelProps, IEditorAnimationTimelinePanelState> {
    public constructor(props: IEditorAnimationTimelinePanelProps) {
        super(props);

        this.state = {
            scale: 1,
        };
    }

    public render(): ReactNode {
        if (this.props.animatable) {
            return this._getAnimationsList(this.props.animatable.animations!);
        }

        return this._getEmpty();
    }

    private _getEmpty(): ReactNode {
        return (
            <div className="flex justify-center items-center font-semibold text-xl w-full h-full">
                No object selected.
            </div>
        );
    }

    private _getAnimationsList(animations: Animation[]): ReactNode {
        return (
            <div className="flex flex-col w-full h-full overflow-x-auto overflow-y-hidden">
                <div className="flex justify-between items-center h-10 p-2">
                    <div className="font-thin text-muted-foreground">
                        ({animations.length} tracks)
                    </div>

                    <Button variant="ghost" className="w-8 h-8 p-1">
                        <AiOutlinePlus className="w-5 h-5" />
                    </Button>
                </div>

                <div
                    style={{
                        width: `${this._getMaxWidthForTimeline()}px`,
                    }}
                    className="flex flex-col min-w-full"
                    onWheel={(ev) => this._onWheelEvent(ev)}
                >
                    {animations.map((animation, index) => (
                        <EditorAnimationTimelineItem
                            key={`${animation.targetProperty}${index}`}
                            animation={animation}
                            scale={this.state.scale}
                            animatable={this.props.animatable}
                            animationEditor={this.props.animationEditor}
                        />
                    ))}
                </div>
            </div>
        );
    }

    private _getMaxWidthForTimeline(): number {
        let width = 0;
        this.props.animatable?.animations?.forEach((animation) => {
            animation.getKeys().forEach((key) => {
                width = Math.max(width, key.frame * this.state.scale);
            });
        });

        return width;
    }

    private _onWheelEvent(ev: React.WheelEvent<HTMLDivElement>): void {
        if (ev.ctrlKey || ev.metaKey) {
            this.setState({ scale: Math.max(0.1, Math.min(10, this.state.scale + ev.deltaY * 0.001)) });
        }
    }
}

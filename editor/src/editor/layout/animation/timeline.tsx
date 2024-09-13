import { Component, ReactNode } from "react";

import { Animation, IAnimatable } from "babylonjs";

export interface IEditorAnimationTimelinePanelProps {
    animatable: IAnimatable | null;
}

export class EditorAnimationTimelinePanel extends Component<IEditorAnimationTimelinePanelProps> {
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

    private _getAnimationsList(_animations: Animation[]): ReactNode {
        return (
            <div className="w-full h-full">

            </div>
        );
    }
}

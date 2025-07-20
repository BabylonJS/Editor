import { Component, ReactNode } from "react";
import { HiOutlineTrash } from "react-icons/hi";

import { Animation } from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";

import { EditorAnimation } from "../../animation";

export interface IEditorAnimationTrackItemProps {
	animation: Animation;
	animationEditor: EditorAnimation;

	onRemove: (animation: Animation) => void;
}

export class EditorAnimationTrackItem extends Component<IEditorAnimationTrackItemProps> {
	public render(): ReactNode {
		return (
			<div
				onMouseLeave={() => this.props.animationEditor.setState({ selectedAnimation: null })}
				onMouseEnter={() => this.props.animationEditor.setState({ selectedAnimation: this.props.animation })}
				className={`
                    flex justify-between items-center w-full h-10 p-2 ring-accent ring-1
                    ${this.props.animationEditor.state.selectedAnimation === this.props.animation ? "bg-secondary" : ""}
                    transition-all duration-300 ease-in-out
                `}
			>
				<div>{this.props.animation.targetProperty}</div>

				<Button
					variant="ghost"
					className={`
                        w-8 h-8 p-1
                        ${this.props.animationEditor.state.selectedAnimation === this.props.animation ? "opacity-100" : "opacity-0"}
                        transition-all duration-300 ease-in-out
                    `}
					onClick={() => this.props.onRemove(this.props.animation)}
				>
					<HiOutlineTrash className="w-5 h-5" />
				</Button>
			</div>
		);
	}
}

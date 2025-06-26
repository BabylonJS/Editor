import { IoPlay, IoStop } from "react-icons/io5";
import { Component, ReactNode } from "react";

import { IAnimatable } from "babylonjs";

import { Button } from "../../../ui/shadcn/ui/button";
import { Slider } from "../../../ui/shadcn/ui/slider";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger } from "../../../ui/shadcn/ui/menubar";

import { EditorAnimation } from "../animation";

import { exportAnimationsAs } from "./tools/export";
import { importAnimationsFrom } from "./tools/import";

export interface IEditorAnimationToolbarProps {
    playing: boolean;
    animatable: IAnimatable | null;
    animationEditor: EditorAnimation;
}

export class EditorAnimationToolbar extends Component<IEditorAnimationToolbarProps> {
	public render(): ReactNode {
		return (
			<div className="flex justify-between items-center w-full h-10 bg-primary-foreground">
				<Menubar className="border-none rounded-none pl-3 my-auto bg-primary-foreground h-10">
					{/* File */}
					<MenubarMenu>
						<MenubarTrigger disabled={this.props.animatable === null}>
                            File
						</MenubarTrigger>

						<MenubarContent className="border-black/50">
							<MenubarItem onClick={() => importAnimationsFrom(this.props.animationEditor, this.props.animatable)}>
                                Load Animations From...
							</MenubarItem>
							<MenubarSeparator />
							<MenubarItem onClick={() => exportAnimationsAs(this.props.animatable)}>
                                Save Animations As...
							</MenubarItem>
						</MenubarContent>
					</MenubarMenu>

					{/* Edit */}
					<MenubarMenu>
						<MenubarTrigger disabled={this.props.animatable === null}>
                            Edit
						</MenubarTrigger>

						<MenubarContent className="border-black/50">
							<MenubarItem onClick={() => this.props.animationEditor.timelines.addKeysAtCurrentTime()}>
                                Add Key Frames At Current Time
							</MenubarItem>
						</MenubarContent>
					</MenubarMenu>
				</Menubar>

				{/* Buttons */}
				<div className="flex gap-2 items-center pr-2">
					<Slider min={1} max={20} step={0.01} className="w-32" value={[this.props.animationEditor.timelines?.state.scale]} onValueChange={(v) => {
						this.props.animationEditor.timelines?.setScale(v[0]);
					}} />

					<Button
						variant="ghost"
						disabled={!this.props.playing}
						onClick={() => this.props.animationEditor.stop()}
						className="w-8 h-8 p-1 disabled:opacity-25 transition-all duration-150 ease-in-out"
					>
						<IoStop className="w-6 h-6" strokeWidth={1} color="green" />
					</Button>

					<Button
						variant="ghost"
						onClick={() => this.props.animationEditor.play()}
						disabled={this.props.animatable === null || this.props.playing}
						className="w-8 h-8 p-1 disabled:opacity-25 transition-all duration-150 ease-in-out"
					>
						<IoPlay className="w-6 h-6" strokeWidth={1} color="green" />
					</Button>
				</div>
			</div>
		);
	}
}

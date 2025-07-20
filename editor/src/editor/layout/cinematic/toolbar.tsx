import { ReactNode } from "react";

import { IoPlay, IoStop } from "react-icons/io5";

import { Slider } from "../../../ui/shadcn/ui/slider";
import { Button } from "../../../ui/shadcn/ui/button";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger } from "../../../ui/shadcn/ui/menubar";

import { CinematicEditor } from "./editor";

export interface ICinematicEditorToolbarProps {
	cinematicEditor: CinematicEditor;
	playing: boolean;
}

export function CinematicEditorToolbar(props: ICinematicEditorToolbarProps): ReactNode {
	return (
		<div className="flex justify-between items-center w-full h-10 bg-primary-foreground">
			<Menubar className="border-none rounded-none pl-3 my-auto bg-primary-foreground h-10">
				{/* File */}
				<MenubarMenu>
					<MenubarTrigger>File</MenubarTrigger>

					<MenubarContent className="border-black/50">
						<MenubarItem>Load From File...</MenubarItem>
						<MenubarSeparator />
						<MenubarItem onClick={() => props.cinematicEditor.save()}>Save</MenubarItem>
						<MenubarItem onClick={() => props.cinematicEditor.saveAs()}>Save As...</MenubarItem>
					</MenubarContent>
				</MenubarMenu>

				{/* Render */}
				<MenubarMenu>
					<MenubarTrigger>Render</MenubarTrigger>

					<MenubarContent className="border-black/50">
						<MenubarItem onClick={() => props.cinematicEditor.openRenderDialog("720p")}>Render 720p</MenubarItem>
						<MenubarItem onClick={() => props.cinematicEditor.openRenderDialog("1080p")}>Render 1080p</MenubarItem>
						<MenubarItem onClick={() => props.cinematicEditor.openRenderDialog("4k")}>Render 4K</MenubarItem>
					</MenubarContent>
				</MenubarMenu>
			</Menubar>

			{/* Buttons */}
			<div className="flex gap-2 items-center pr-2">
				<Slider
					min={0.1}
					max={5}
					step={0.01}
					className="w-32"
					value={[props.cinematicEditor.timelines?.state.scale]}
					onValueChange={(v) => {
						props.cinematicEditor.timelines?.setState(
							{
								scale: v[0],
							},
							() => {
								props.cinematicEditor.forceUpdate();
							}
						);
					}}
				/>

				<Button
					variant="ghost"
					disabled={!props.playing}
					onClick={() => props.cinematicEditor.stop()}
					className="w-8 h-8 p-1 disabled:opacity-25 transition-all duration-150 ease-in-out"
				>
					<IoStop className="w-6 h-6" strokeWidth={1} color="green" />
				</Button>

				<Button
					variant="ghost"
					disabled={props.playing}
					onClick={() => props.cinematicEditor.play()}
					className="w-8 h-8 p-1 disabled:opacity-25 transition-all duration-150 ease-in-out"
				>
					<IoPlay className="w-6 h-6" strokeWidth={1} color="green" />
				</Button>
			</div>
		</div>
	);
}

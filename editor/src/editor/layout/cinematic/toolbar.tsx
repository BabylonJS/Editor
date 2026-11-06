import { SlGraph } from "react-icons/sl";
import { FaDiamond } from "react-icons/fa6";
import { IoArrowBack, IoPlay, IoStop } from "react-icons/io5";

import { Slider } from "../../../ui/shadcn/ui/slider";
import { Button } from "../../../ui/shadcn/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../ui/shadcn/ui/tooltip";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger } from "../../../ui/shadcn/ui/menubar";

import { CinematicEditor } from "./editor";

export interface ICinematicEditorToolbarProps {
	cinematicEditor: CinematicEditor;
	playing: boolean;
}

export function CinematicEditorToolbar(props: ICinematicEditorToolbarProps) {
	const sequence = props.cinematicEditor.state.sequence;

	return (
		<div className="relative flex justify-between items-center w-full h-10 bg-primary-foreground">
			{/* Left */}
			<div className="flex items-center min-w-0 h-10">
				{sequence && (
					<TooltipProvider delayDuration={0}>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" className="w-8 h-8 p-1 ml-2 shrink-0" onClick={() => props.cinematicEditor.closeSequence()}>
									<IoArrowBack className="w-5 h-5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Back to the sequences</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}

				<Menubar className={`border-none rounded-none my-auto bg-primary-foreground h-10 ${sequence ? "pl-1" : "pl-3"}`}>
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

				{sequence && <div className="pl-2 text-sm font-semibold truncate">{sequence.name}</div>}
			</div>

			{/* Center */}
			<div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2 items-center pr-2 ${sequence ? "" : "hidden"}`}>
				<div className="flex items-center gap-2 px-5">
					<Button
						className="flex items-center gap-2 w-32 h-8 py-0.5"
						onClick={() => props.cinematicEditor.setState({ editType: "keyframes" })}
						variant={props.cinematicEditor.state.editType === "keyframes" ? "secondary" : "ghost"}
					>
						<FaDiamond className="w-4 h-4" /> Keys
					</Button>
					<Button
						className="flex items-center gap-2 w-32 h-8 py-0.5"
						variant={props.cinematicEditor.state.editType === "curves" ? "secondary" : "ghost"}
						onClick={() => {
							props.cinematicEditor.setState({ editType: "curves" }, () => {
								props.cinematicEditor.forceUpdate();
							});
						}}
					>
						<SlGraph className="w-6 h-6" /> Curves
					</Button>
				</div>
			</div>

			{/* Right */}
			<div className="flex gap-2 items-center pr-2">
				<Slider
					min={0.1}
					max={5}
					step={0.01}
					className="w-32"
					value={[props.cinematicEditor.state.timelinesScale]}
					onValueChange={(v) => {
						props.cinematicEditor.setState(
							{
								timelinesScale: v[0],
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

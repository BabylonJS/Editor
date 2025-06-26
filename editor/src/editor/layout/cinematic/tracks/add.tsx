import { AiOutlinePlus } from "react-icons/ai";

import { Button } from "../../../../ui/shadcn/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "../../../../ui/shadcn/ui/dropdown-menu";

import { CinematicEditor } from "../editor";

export interface ICinematicEditorTrackAddProps {
    cinematicEditor: CinematicEditor;
}

export function CinematicEditorTrackAdd(props: ICinematicEditorTrackAddProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<Button variant="ghost" className="w-8 h-8 p-1">
					<AiOutlinePlus className="w-5 h-5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem onClick={() => props.cinematicEditor.tracks.addPropertyTrack()}>
                    Property Track
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => props.cinematicEditor.tracks.addAnimationGroupTrack()}>
                    Animation Group Track
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => props.cinematicEditor.tracks.addSoundTrack()}>
                    Sound Track
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => props.cinematicEditor.tracks.addEventTrack()}>
                    Event Track
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
                        Default Rendering Pipeline
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem onClick={() => props.cinematicEditor.tracks.addPropertyTrack({ defaultRenderingPipeline: true, propertyPath: "imageProcessing.exposure" })}>
                            Exposure
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => props.cinematicEditor.tracks.addPropertyTrack({ defaultRenderingPipeline: true, propertyPath: "imageProcessing.contrast" })}>
                            Contrast
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => props.cinematicEditor.tracks.addPropertyTrack({ defaultRenderingPipeline: true, propertyPath: "depthOfField.focusDistance" })}>
                            Depth-of-field Focus Distance
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => props.cinematicEditor.tracks.addPropertyTrack({ defaultRenderingPipeline: true, propertyPath: "depthOfField.fStop" })}>
                            Depth-of-field F-Stop
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => props.cinematicEditor.tracks.addPropertyTrack({ defaultRenderingPipeline: true, propertyPath: "depthOfField.lensSize" })}>
                            Depth-of-field Lens Size
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => props.cinematicEditor.tracks.addPropertyTrack({ defaultRenderingPipeline: true, propertyPath: "depthOfField.focalLength" })}>
                            Depth-of-field Focal Length
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => props.cinematicEditor.tracks.addPropertyTrack({ defaultRenderingPipeline: true })}>
                            Custom
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

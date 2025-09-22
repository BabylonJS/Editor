import { FaGear } from "react-icons/fa6";

import { Label } from "../../../../ui/shadcn/ui/label";
import { Button } from "../../../../ui/shadcn/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../ui/shadcn/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../ui/shadcn/ui/select";

import { CinematicEditor } from "../editor";

export interface ICinematicEditorTimelineOptionsProps {
	cinematicEditor: CinematicEditor;
}

export function CinematicEditorTimelineOptions(props: ICinematicEditorTimelineOptionsProps) {
	function handleOutputFramesPerSecondChange(value: string) {
		props.cinematicEditor.cinematic.outputFramesPerSecond = parseFloat(value);
		props.cinematicEditor.forceUpdate();
	}

	return (
		<Popover>
			<PopoverTrigger>
				<Button variant="ghost" className="rounded-full px-2">
					<FaGear className="w-4 h-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-96">
				<div className="grid gap-4">
					<div className="space-y-2">
						<h4 className="font-medium leading-none">Timeline options</h4>
						<p className="text-sm text-muted-foreground">Configure the options of the timeline.</p>
					</div>

					<div className="grid gap-2">
						<div className="grid grid-cols-2 items-center gap-4">
							<Label>Frames per second</Label>

							<Select value={props.cinematicEditor.cinematic.outputFramesPerSecond?.toString()} onValueChange={(v) => handleOutputFramesPerSecondChange(v)}>
								<SelectTrigger className="">
									<SelectValue placeholder="Default (60 ips)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="24">24 ips (Classic cinema film)</SelectItem>
									<SelectItem value="29.97">29.97 ips (NTSC)</SelectItem>
									<SelectItem value="30">30 ips (NTSC)</SelectItem>
									<SelectItem value="50">50 ips (PAL)</SelectItem>
									<SelectItem value="60">60 ips (PAL)</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

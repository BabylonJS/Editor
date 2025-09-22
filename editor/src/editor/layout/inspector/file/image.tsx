import { basename } from "path/posix";

import { useState } from "react";
import { AiFillPicture } from "react-icons/ai";

import { Divider } from "@blueprintjs/core";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../ui/shadcn/ui/table";

import { FileInspectorObject } from "../file";

export interface IEditorInspectorImageComponentProps {
	object: FileInspectorObject;
}

export function EditorInspectorImageComponent(props: IEditorInspectorImageComponentProps) {
	const [width, setWidth] = useState(0);
	const [height, setHeight] = useState(0);

	return (
		<div className="flex flex-col gap-2">
			<div className="flex gap-2 justify-center items-center text-xl font-bold">
				<AiFillPicture size="24px" />
				{basename(props.object.absolutePath)}
			</div>

			<Divider />

			<div className="w-full aspect-square p-5 rounded-lg bg-black/50">
				<img
					alt=""
					draggable={false}
					src={props.object.absolutePath}
					className="w-full aspect-square object-contain"
					onLoad={(ev) => {
						setWidth(ev.currentTarget.naturalWidth);
						setHeight(ev.currentTarget.naturalHeight);
					}}
				/>
			</div>

			<div className="bg-black/50 p-5 rounded-lg">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Property</TableHead>
							<TableHead>Value</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow>
							<TableCell className="font-medium">Width</TableCell>
							<TableCell>{width}px</TableCell>
						</TableRow>
						<TableRow>
							<TableCell className="font-medium">Height</TableCell>
							<TableCell>{height}px</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

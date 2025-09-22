import { DragEvent, useState } from "react";

export interface IEditorAssetsTreeLabelProps {
	name: string;
	relativePath: string;

	onDrop: (ev: DragEvent<HTMLDivElement>) => void;
}

export function EditorAssetsTreeLabel(props: IEditorAssetsTreeLabelProps) {
	const [over, setOver] = useState(false);

	function handleDragOver(ev: DragEvent<HTMLDivElement>) {
		ev.preventDefault();
		ev.stopPropagation();

		setOver(true);
	}

	function handleDragLeave(ev: DragEvent<HTMLDivElement>) {
		ev.preventDefault();
		setOver(false);
	}

	function handleDrop(ev: DragEvent<HTMLDivElement>) {
		ev.preventDefault();
		ev.stopPropagation();

		setOver(false);

		if (props.relativePath.startsWith("assets")) {
			props.onDrop(ev);
		}
	}

	return (
		<div
			draggable
			className={`
                ml-2 p-1 w-full h-full pointer-events-auto
                ${over ? "bg-muted px-2 py-2 rounded-lg" : ""}
				transition-all duration-300 ease-in-out
                ${props.relativePath.startsWith("public") || props.relativePath.startsWith("node_modules") || props.relativePath.startsWith("assets/editor-generated_") ? "opacity-35" : ""}
            `}
			onDragOver={(ev) => handleDragOver(ev)}
			onDragLeave={(ev) => handleDragLeave(ev)}
			onDrop={(ev) => handleDrop(ev)}
		>
			{props.name}
		</div>
	);
}

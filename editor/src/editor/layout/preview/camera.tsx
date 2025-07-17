import { useEffect, useRef } from "react";
import { AiOutlineClose } from "react-icons/ai";

import { Camera } from "babylonjs";

import { Button } from "../../../ui/shadcn/ui/button";

import { Editor } from "../../main";

export interface IEditorPreviewCameraProps {
	editor: Editor;
	camera: Camera;
}

export function EditorPreviewCamera(props: IEditorPreviewCameraProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current!;
		const engine = props.editor.layout.preview.engine;

		engine.registerView(canvas, props.camera);

		return () => {
			engine.unRegisterView(canvas);
		};
	}, []);

	return (
		<div className="absolute bottom-0 right-0 w-1/4 h-1/4 flex flex-col shadow-lg rounded bg-background/80 border border-border overflow-hidden m-2">
			<div className="absolute top-0 left-0 w-full bg-black/70 text-white text-xs px-2 py-1  border-b border-border flex justify-between items-center">
				{props.camera.name ?? "Preview Camera"}
				<Button variant="ghost" className="px-1 py-1 w-5 h-5" onClick={() => props.editor.layout.preview.setCameraPreviewActive(null)}>
					<AiOutlineClose />
				</Button>
			</div>
			<canvas
				ref={canvasRef}
				className="w-full h-full bg-black"
			/>
		</div>
	);
}

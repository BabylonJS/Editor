import { useEffect, useRef } from "react";
import { AiOutlineClose } from "react-icons/ai";

import { Camera } from "babylonjs";

import { cn } from "../../../ui/utils";
import { Button } from "../../../ui/shadcn/ui/button";

import { Editor } from "../../main";

export interface IEditorPreviewCameraProps {
	editor: Editor;
	camera: Camera;
	hidden?: boolean;
}

export function EditorPreviewCamera(props: IEditorPreviewCameraProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current!;
		const engine = props.editor.layout.preview.engine;

		const mainCanvas = engine.getRenderingCanvas()!;

		const view = engine.registerView(canvas, props.camera);
		view.customResize = (canvas) => {
			canvas.width = mainCanvas.width;
			canvas.height = mainCanvas.height;
		};

		return () => {
			engine.unRegisterView(canvas);
		};
	}, []);

	return (
		<div className={cn("absolute bottom-0 left-0 w-1/3 h-1/3 flex flex-col rounded-lg bg-background/80 ring-2 ring-background overflow-hidden m-2", props.hidden && "hidden")}>
			<div className="absolute top-0 left-0 w-full bg-background text-xs font-bold px-2 py-1 flex justify-between items-center">
				{props.camera.name ?? "Preview Camera"}
				<Button variant="ghost" className="px-1 py-1 w-5 h-5" onClick={() => props.editor.layout.preview.setCameraPreviewActive(null)}>
					<AiOutlineClose />
				</Button>
			</div>
			<canvas ref={canvasRef} className="w-full h-full object-contain bg-black" />
		</div>
	);
}

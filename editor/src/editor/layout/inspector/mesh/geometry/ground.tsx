import sharp from "sharp";
import { dirname, join } from "path/posix";

import { XMarkIcon } from "@heroicons/react/20/solid";
import { MdOutlineQuestionMark } from "react-icons/md";

import { DragEvent, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { Mesh, Color3, CreateGroundVertexData, CreateGroundFromHeightMapVertexData } from "babylonjs";

import { Editor } from "../../../../main";

import { isGroundMesh } from "../../../../../tools/guards/nodes";
import { registerUndoRedo } from "../../../../../tools/undoredo";
import { smoothGroundGeometry } from "../../../../../tools/mesh/ground";

import { projectConfiguration } from "../../../../../project/configuration";

import { EditorInspectorColorField } from "../../fields/color";
import { EditorInspectorNumberField } from "../../fields/number";
import { EditorInspectorSectionField } from "../../fields/section";

import { getProxy } from "./proxy";

export interface IGroundMeshGeometryInspectorProps {
	object: Mesh;
	editor: Editor;
}

export function GroundMeshGeometryInspector(props: IGroundMeshGeometryInspectorProps) {
	const [dragOver, setDragOver] = useState(false);
	const [heightMapTexturePath, setHeightMapTexturePath] = useState<string | null>(null);

	const heightMapTextureData = useRef({
		width: 0,
		height: 0,
		buffer: null as Uint8Array | null,
		heightMapTexturePath: null as string | null,
		processing: false,
	});

	const proxy = getProxy<any>(props.object.metadata, () => {
		handleUpdateGeometry();
	});

	useEffect(() => {
		// From v5.1.1
		props.object.metadata.minHeight ??= 0;
		props.object.metadata.maxHeight ??= 150;
		props.object.metadata.smoothFactor ??= 0;
		props.object.metadata.heightMapTexturePath ??= null;
		props.object.metadata.alphaFilter ??= 0;
		props.object.metadata.colorFilter ??= [1, 1, 1];

		setHeightMapTexturePath(props.object.metadata.heightMapTexturePath);
	}, [props.object]);

	async function handleUpdateGeometry() {
		if (props.object.metadata.heightMapTexturePath) {
			await handleUpdateHeightMapGeometry();
		} else {
			handleUpdateSimpleGeometry();
		}

		props.object.refreshBoundingInfo({
			updatePositionsArray: true,
		});

		if (isGroundMesh(props.object)) {
			props.object.updateCoordinateHeights();
		}
	}

	function handleUpdateSimpleGeometry() {
		props.object.geometry?.setAllVerticesData(
			CreateGroundVertexData({
				width: props.object.metadata.width,
				height: props.object.metadata.height,
				subdivisions: props.object.metadata.subdivisions >> 0,
			}),
			false
		);
	}

	async function handleUpdateHeightMapGeometry() {
		const subdivisions = props.object.metadata.subdivisions >> 0;

		if (!heightMapTextureData.current.buffer || heightMapTextureData.current.heightMapTexturePath !== props.object.metadata.heightMapTexturePath) {
			if (heightMapTextureData.current.processing) {
				return;
			}

			heightMapTextureData.current.processing = true;

			const textureAbsolutePath = join(dirname(projectConfiguration.path ?? ""), props.object.metadata.heightMapTexturePath);
			const sTexture = sharp(textureAbsolutePath);

			const [textureMetadata, textureBuffer] = await Promise.all([sTexture.metadata(), sTexture.raw().ensureAlpha(1).toBuffer()]);

			heightMapTextureData.current.buffer = textureBuffer;
			heightMapTextureData.current.width = textureMetadata.width;
			heightMapTextureData.current.height = textureMetadata.height;

			heightMapTextureData.current.processing = false;
		}

		if (subdivisions <= 1) {
			props.object.metadata.subdivisions = 32;
			toast.warning("Subdivisions set to 32. See console for more information.");
			props.editor.layout.console.warn(`Ground's subdivisions were less or equal to 1. Subdivisions set to 32 for mesh "${props.object.name}"`);
		}

		const vertexData = CreateGroundFromHeightMapVertexData({
			width: props.object.metadata.width,
			height: props.object.metadata.height,
			subdivisions: props.object.metadata.subdivisions,
			alphaFilter: props.object.metadata.alphaFilter ?? 0,
			minHeight: props.object.metadata.minHeight ?? 0,
			maxHeight: props.object.metadata.maxHeight ?? 255,
			colorFilter: Color3.FromArray(props.object.metadata.colorFilter),
			bufferWidth: heightMapTextureData.current.width,
			bufferHeight: heightMapTextureData.current.height,
			buffer: heightMapTextureData.current.buffer,
		});

		// Smooth the terrain
		smoothGroundGeometry({
			ground: props.object,
			indices: vertexData.indices,
			normals: vertexData.normals,
			positions: vertexData.positions,
			subdivisions: props.object.metadata.subdivisions,
			smoothFactor: props.object.metadata.smoothFactor,
		});

		props.object.geometry?.setAllVerticesData(vertexData, false);
	}

	function handleRemoveHeightMapTexture() {
		const oldHeightMapTexturePath = props.object.metadata.heightMapTexturePath;

		registerUndoRedo({
			executeRedo: true,
			undo: () => (proxy.heightMapTexturePath = oldHeightMapTexturePath),
			redo: () => (proxy.heightMapTexturePath = null),
		});

		setHeightMapTexturePath(null);
	}

	function handleDragOver(ev: DragEvent<HTMLDivElement>) {
		ev.preventDefault();
		setDragOver(true);
	}

	function handleDragLeave(ev: DragEvent<HTMLDivElement>) {
		ev.preventDefault();
		setDragOver(false);
	}

	function handleOnDrop(ev: DragEvent<HTMLDivElement>) {
		ev.preventDefault();
		setDragOver(false);
		if (projectConfiguration.path) {
			let texturePath = JSON.parse(ev.dataTransfer.getData("assets"))[0];
			texturePath = texturePath.replace(join(dirname(projectConfiguration.path!), "/"), "");

			const oldHeightMapTexturePath = props.object.metadata.heightMapTexturePath;

			registerUndoRedo({
				executeRedo: true,
				undo: () => (proxy.heightMapTexturePath = oldHeightMapTexturePath),
				redo: () => (proxy.heightMapTexturePath = texturePath),
			});

			setHeightMapTexturePath(texturePath);
		}
	}

	const o = {
		colorFilter: Color3.FromArray(proxy.colorFilter ?? [1, 1, 1]),
	};

	return (
		<EditorInspectorSectionField title="Ground">
			<EditorInspectorNumberField object={proxy} property="width" label="Width" step={0.1} />
			<EditorInspectorNumberField object={proxy} property="height" label="Height" step={0.1} />
			<EditorInspectorNumberField object={proxy} property="subdivisions" label="Subdivisions" step={1} min={1} />

			<div
				onDrop={handleOnDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				className={`
					relative flex items-start gap-2 rounded-lg
					${heightMapTexturePath ? "p-2" : "border-[1px] border-secondary-foreground/35 border-dashed"}
					${dragOver ? "bg-muted-foreground/75 dark:bg-muted-foreground/20" : ""}
					transition-all duration-300 ease-in-out
				`}
			>
				<div className={`flex items-center justify-center w-24 ${heightMapTexturePath ? "h-24" : "h-[64px]"}`}>
					{heightMapTexturePath ? (
						<img className="w-full h-full aspect-square object-contain" src={join(dirname(projectConfiguration.path ?? ""), heightMapTexturePath)} />
					) : (
						<div className="flex items-center justify-center rounded-lg w-full h-full">
							<MdOutlineQuestionMark className="w-8 h-8" />
						</div>
					)}
				</div>

				{!heightMapTexturePath && (
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-semibold text-muted-foreground text-center">
						Drag'n'drop HeightMap texture here
					</div>
				)}

				{heightMapTexturePath && (
					<>
						<div className="flex flex-1 flex-col gap-2">
							<div className="px-2">HeightMap Properties</div>
							<EditorInspectorNumberField object={proxy} property="minHeight" label="Min Height" step={1} />
							<EditorInspectorNumberField object={proxy} property="maxHeight" label="Max Height" step={1} />
						</div>
						<div
							onClick={handleRemoveHeightMapTexture}
							className="flex justify-center items-center h-full w-14 hover:bg-muted-foreground rounded-lg transition-all duration-300"
						>
							<XMarkIcon className="w-6 h-6" />
						</div>
					</>
				)}
			</div>

			{heightMapTexturePath && (
				<>
					<EditorInspectorColorField
						noUndoRedo
						object={o}
						property="colorFilter"
						label="Filter"
						onChange={(color) => {
							proxy.colorFilter = color.asArray();
						}}
						onFinishChange={(color, oldColor) => {
							registerUndoRedo({
								executeRedo: true,
								undo: () => (proxy.colorFilter = oldColor.asArray()),
								redo: () => (proxy.colorFilter = color.asArray()),
							});
						}}
					/>

					<EditorInspectorNumberField object={proxy} property="alphaFilter" label="Alpha Filter" step={1} min={0} max={255} />
					<EditorInspectorNumberField object={proxy} property="smoothFactor" label="Smooth Factor" step={1} min={0} max={32} />
				</>
			)}
		</EditorInspectorSectionField>
	);
}

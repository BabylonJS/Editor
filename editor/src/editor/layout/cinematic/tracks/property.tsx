import { DragEvent, useState } from "react";

import { IoMdCube } from "react-icons/io";
import { GiSparkles } from "react-icons/gi";
import { PiApertureFill } from "react-icons/pi";
import { IoSparklesSharp } from "react-icons/io5";
import { MdOutlineQuestionMark } from "react-icons/md";
import { FaCamera, FaLightbulb } from "react-icons/fa6";
import { HiOutlineCubeTransparent } from "react-icons/hi2";

import { Node, IParticleSystem } from "babylonjs";
import { ICinematicTrack } from "babylonjs-editor-tools";

import { showAlert } from "../../../../ui/dialog";
import { Button } from "../../../../ui/shadcn/ui/button";

import { showAddTrackPrompt } from "../../animation/tracks/add";

import { getDefaultRenderingPipeline } from "../../../rendering/default-pipeline";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue } from "../../../../tools/property";
import { isParticleSystem, isGPUParticleSystem } from "../../../../tools/guards/particles";
import { isAbstractMesh, isCamera, isLight, isTransformNode } from "../../../../tools/guards/nodes";

import { CinematicEditor } from "../editor";
import { CinematicEditorRemoveTrackButton } from "./remove";

export interface ICinematicEditorPropertyTrackProps {
	track: ICinematicTrack;
	cinematicEditor: CinematicEditor;
}

export function CinematicEditorPropertyTrack(props: ICinematicEditorPropertyTrackProps) {
	const [dragOver, setDragOver] = useState(false);

	function getTargetIcon(object: any) {
		if (object) {
			if (isTransformNode(object)) {
				return <HiOutlineCubeTransparent className="w-4 h-4" />;
			}

			if (isAbstractMesh(object)) {
				return <IoMdCube className="w-4 h-4" />;
			}

			if (isLight(object)) {
				return <FaLightbulb className="w-4 h-4" />;
			}

			if (isCamera(object)) {
				return <FaCamera className="w-4 h-4" />;
			}

			if (isParticleSystem(object)) {
				return <IoSparklesSharp className="w-4 h-4" />;
			}

			if (isGPUParticleSystem(object)) {
				return <GiSparkles className="w-4 h-4" />;
			}

			if (object === getDefaultRenderingPipeline()) {
				return <PiApertureFill className="w-4 h-4" />;
			}
		}

		return <MdOutlineQuestionMark className="w-4 h-4" />;
	}

	function handleDragStart(ev: DragEvent<HTMLDivElement>) {
		if (props.track.node) {
			ev.dataTransfer.setData("graph/node", JSON.stringify([props.track.node.id]));
		}
	}

	function handleDragOver(event: DragEvent<HTMLDivElement>) {
		event.preventDefault();
		event.stopPropagation();
		setDragOver(true);
	}

	function handleDragLeave(event: DragEvent<HTMLDivElement>) {
		event.preventDefault();
		setDragOver(false);
	}

	function handleDrop(event: DragEvent<HTMLDivElement>) {
		event.preventDefault();
		event.stopPropagation();

		setDragOver(false);

		const scene = props.cinematicEditor.editor.layout.preview.scene;
		const data = JSON.parse(event.dataTransfer.getData("graph/node")) as string[];

		let node: Node | IParticleSystem | null = scene.getNodeById(data[0]);
		if (!node) {
			node = scene.particleSystems?.find((ps) => ps.id === data[0]) ?? null;
		}

		if (node && node !== props.track.node) {
			const oldNode = props.track.node;
			const oldPropertyPath = props.track.propertyPath;
			const oldKeyFrameAnimations = props.track.keyFrameAnimations;

			registerUndoRedo({
				executeRedo: true,
				undo: () => {
					props.track.node = oldNode;
					props.track.propertyPath = oldPropertyPath;
					props.track.keyFrameAnimations = oldKeyFrameAnimations;
				},
				redo: () => {
					props.track.node = node;

					if (props.track.propertyPath) {
						const propertyValue = getInspectorPropertyValue(node, props.track.propertyPath) ?? null;
						if (propertyValue === null) {
							props.track.propertyPath = undefined;
							props.track.keyFrameAnimations = [];
						}
					}
				},
			});

			props.cinematicEditor.forceUpdate();
		}
	}

	async function selectPropertyToAnimate() {
		const node = props.track.defaultRenderingPipeline
			? getDefaultRenderingPipeline()
			: props.track.node;

		if (!node) {
			return;
		}

		const property = await showAddTrackPrompt(node);

		if (!property || property === props.track.propertyPath) {
			return;
		}

		const value = getInspectorPropertyValue(node, property);
		if (value === null || value === undefined) {
			return showAlert("Property not found", `The property to animate "${property}" was not found on the object.`);
		}

		const existingAnimation = props.cinematicEditor.cinematic.tracks?.find((a) => a.node === node && a.propertyPath === property);
		if (existingAnimation) {
			return showAlert("Property already animated", `The property "${property}" is already animated and cannot be animated twice.`);
		}

		const oldPropertyPath = props.track.propertyPath;
		const oldKeyFrameAnimations = props.track.keyFrameAnimations;

		registerUndoRedo({
			executeRedo: true,
			undo: () => {
				props.track.propertyPath = oldPropertyPath;
				props.track.keyFrameAnimations = oldKeyFrameAnimations;
			},
			redo: () => {
				props.track.propertyPath = property;
				props.track.keyFrameAnimations = [
					{ type: "key", frame: 0, value: value.clone?.() ?? value },
					{ type: "key", frame: 60, value: value.clone?.() ?? value },
				];
			},
		});

		props.cinematicEditor.forceUpdate();
	}

	return (
		<div className="flex gap-2 items-center w-full h-full">
			<div
				draggable
				onDragStart={(ev) => handleDragStart(ev)}
				onDragOver={(ev) => handleDragOver(ev)}
				onDragLeave={(ev) => handleDragLeave(ev)}
				onDrop={(ev) => handleDrop(ev)}
				className={`
                    flex justify-center items-center w-8 h-8 rounded-md
                    ${dragOver ? "bg-accent" : ""}
                `}
			>
				{getTargetIcon(props.track.node ?? (props.track.defaultRenderingPipeline ? getDefaultRenderingPipeline() : null))}
			</div>

			<div className="flex-1">
				<Button variant="ghost" className="w-full h-8 bg-accent/35" onClick={() => selectPropertyToAnimate()}>
					<span className="w-full text-xs whitespace-nowrap overflow-hidden overflow-ellipsis">
						{props.track.propertyPath?.split(".").pop() ?? "No property"}
					</span>
				</Button>
			</div>

			<CinematicEditorRemoveTrackButton {...props} />
		</div>
	);
}

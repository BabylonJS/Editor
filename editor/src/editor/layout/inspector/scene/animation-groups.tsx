import { Reorder } from "framer-motion";

import { MouseEvent, useEffect, useState } from "react";

import { AiOutlineMinus } from "react-icons/ai";
import { IoPlay, IoStop } from "react-icons/io5";

import { Scene, AnimationGroup } from "babylonjs";

import { Editor } from "../../../main";

import { Button } from "../../../../ui/shadcn/ui/button";

import { registerUndoRedo } from "../../../../tools/undoredo";

import { EditorInspectorSectionField } from "../fields/section";

export interface IEditorSceneAnimationGroupsInspectorProps {
	object: Scene;
	editor: Editor;
}

export function EditorSceneAnimationGroupsInspector(props: IEditorSceneAnimationGroupsInspectorProps) {
	const [animationGroupsSearch, setAnimationGroupsSearch] = useState<string>("");
	const [selectedAnimationGroups, setSelectedAnimationGroups] = useState<AnimationGroup[]>([]);

	const [animationGroups, setAnimationGroups] = useState<AnimationGroup[]>([]);
	const [playingAnimationGroups, setPlayingAnimationGroups] = useState<AnimationGroup[]>([]);

	useEffect(() => {
		setAnimationGroups(props.object.animationGroups);
		setPlayingAnimationGroups(props.object.animationGroups.filter((animationGroup) => animationGroup.isPlaying));
	}, [props.object]);

	function handleAnimationGroupClick(ev: MouseEvent<HTMLDivElement>, animationGroup: AnimationGroup): void {
		if (ev.ctrlKey || ev.metaKey) {
			const newSelectedAnimationGroups = selectedAnimationGroups.slice();
			if (newSelectedAnimationGroups.includes(animationGroup)) {
				const index = newSelectedAnimationGroups.indexOf(animationGroup);
				if (index !== -1) {
					newSelectedAnimationGroups.splice(index, 1);
				}
			} else {
				newSelectedAnimationGroups.push(animationGroup);
			}

			setSelectedAnimationGroups(newSelectedAnimationGroups);
		} else if (ev.shiftKey) {
			const newSelectedAnimationGroups = selectedAnimationGroups.slice();
			const lastSelectedAnimationGroup = newSelectedAnimationGroups[newSelectedAnimationGroups.length - 1];
			if (!lastSelectedAnimationGroup) {
				return setSelectedAnimationGroups([animationGroup]);
			}

			const lastIndex = props.object.animationGroups.indexOf(lastSelectedAnimationGroup);
			const currentIndex = props.object.animationGroups.indexOf(animationGroup);

			const [start, end] = lastIndex < currentIndex ? [lastIndex, currentIndex] : [currentIndex, lastIndex];

			for (let i = start; i <= end; i++) {
				const ag = props.object.animationGroups[i];
				if (!newSelectedAnimationGroups.includes(ag)) {
					newSelectedAnimationGroups.push(ag);
				}
			}

			setSelectedAnimationGroups(newSelectedAnimationGroups);
		} else {
			setSelectedAnimationGroups([animationGroup]);
		}
	}

	function handlePlayOrStopAnimationGroup(animationGroup: AnimationGroup): void {
		if (animationGroup.isPlaying) {
			animationGroup.stop();
			setPlayingAnimationGroups(playingAnimationGroups.filter((ag) => ag !== animationGroup));
		} else {
			animationGroup.play(true);
			setPlayingAnimationGroups([...playingAnimationGroups, animationGroup]);
		}
	}

	function handlePlaySelectedAnimationGroups(): void {
		props.object.animationGroups.forEach((animationGroup) => {
			animationGroup.stop();
		});

		selectedAnimationGroups.forEach((animationGroup) => {
			animationGroup.play(true);
		});

		setPlayingAnimationGroups(props.object.animationGroups.filter((animationGroup) => animationGroup.isPlaying));
	}

	function handleRemoveSelectedAnimationGroups(): void {
		registerUndoRedo({
			executeRedo: true,
			undo: () => {
				selectedAnimationGroups.forEach((animationGroup) => {
					props.object.addAnimationGroup(animationGroup);
				});
			},
			redo: () => {
				selectedAnimationGroups.forEach((animationGroup) => {
					props.object.removeAnimationGroup(animationGroup);
				});
			},
		});

		setAnimationGroups(props.object.animationGroups.slice());
	}

	const hasAnimations = animationGroups.length > 0;
	const animations = animationGroups.filter((animationGroup) => animationGroup.name.toLowerCase().includes(animationGroupsSearch.toLowerCase()));

	return (
		<EditorInspectorSectionField title="Animation Groups">
			{!hasAnimations && <div className="text-center text-xl">No animation groups</div>}

			{hasAnimations && (
				<>
					<input
						type="text"
						placeholder="Search..."
						value={animationGroupsSearch}
						onChange={(e) => setAnimationGroupsSearch(e.currentTarget.value)}
						className="px-5 py-2 rounded-lg bg-primary-foreground outline-none w-full"
					/>

					<div className="flex justify-between items-center">
						<div className="p-2 font-bold">Actions</div>

						<div className="flex gap-2">
							<Button variant="ghost" disabled={selectedAnimationGroups.length === 0} className="p-1 w-8 h-8" onClick={() => handleRemoveSelectedAnimationGroups()}>
								<AiOutlineMinus className="w-6 h-6" />
							</Button>

							<Button variant="ghost" className="p-1 w-8 h-8" onClick={() => handlePlaySelectedAnimationGroups()}>
								<IoPlay className="w-6 h-6" />
							</Button>
						</div>
					</div>

					<Reorder.Group
						axis="y"
						values={props.object.animationGroups}
						onReorder={(items) => {
							setAnimationGroups(items);
							props.object.animationGroups = items;
						}}
						className="flex flex-col rounded-lg bg-black/50 text-white/75 h-96 overflow-y-auto"
					>
						{animations.map((animationGroup) => (
							<Reorder.Item key={`${animationGroup.name}`} value={animationGroup} id={`${animationGroup.name}`}>
								<div
									onClick={(ev) => handleAnimationGroupClick(ev, animationGroup)}
									className={`
                                        flex items-center gap-2
                                        ${selectedAnimationGroups.includes(animationGroup) ? "bg-muted" : "hover:bg-muted/35"}
                                        transition-all duration-300 ease-in-out
                                    `}
								>
									<Button variant="ghost" className="w-8 h-8 p-1" onClick={() => handlePlayOrStopAnimationGroup(animationGroup)}>
										{animationGroup.isPlaying ? <IoStop className="w-6 h-6" strokeWidth={1} /> : <IoPlay className="w-6 h-6" strokeWidth={1} />}
									</Button>
									{animationGroup.name}
								</div>
							</Reorder.Item>
						))}
					</Reorder.Group>
				</>
			)}
		</EditorInspectorSectionField>
	);
}

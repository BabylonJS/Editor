import { Reorder } from "framer-motion";

import { MouseEvent, useEffect, useState } from "react";

import { IoPlay, IoStop } from "react-icons/io5";
import { AiFillMerge, AiOutlineClose, AiOutlineMinus } from "react-icons/ai";

import { Scene, AnimationGroup } from "babylonjs";

import { Editor } from "../../../main";

import { showPrompt } from "../../../../ui/dialog";
import { Button } from "../../../../ui/shadcn/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "../../../../ui/shadcn/ui/context-menu";

import { registerUndoRedo } from "../../../../tools/undoredo";

import { EditorInspectorSectionField } from "../fields/section";

export interface IEditorSceneAnimationGroupsInspectorProps {
	scene: Scene;
	editor: Editor;
}

export function EditorSceneAnimationGroupsInspector(props: IEditorSceneAnimationGroupsInspectorProps) {
	const [animationGroupsSearch, setAnimationGroupsSearch] = useState<string>("");
	const [selectedAnimationGroups, setSelectedAnimationGroups] = useState<AnimationGroup[]>([]);

	const [animationGroups, setAnimationGroups] = useState<AnimationGroup[]>([]);
	const [playingAnimationGroups, setPlayingAnimationGroups] = useState<AnimationGroup[]>([]);

	useEffect(() => {
		setAnimationGroups(props.scene.animationGroups);
		setPlayingAnimationGroups(props.scene.animationGroups.filter((animationGroup) => animationGroup.isPlaying));
	}, [props.scene]);

	function handleAnimationGroupClick(ev: MouseEvent<HTMLDivElement>, animationGroup: AnimationGroup) {
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

			const lastIndex = props.scene.animationGroups.indexOf(lastSelectedAnimationGroup);
			const currentIndex = props.scene.animationGroups.indexOf(animationGroup);

			const [start, end] = lastIndex < currentIndex ? [lastIndex, currentIndex] : [currentIndex, lastIndex];

			for (let i = start; i <= end; i++) {
				const ag = props.scene.animationGroups[i];
				if (!newSelectedAnimationGroups.includes(ag)) {
					newSelectedAnimationGroups.push(ag);
				}
			}

			setSelectedAnimationGroups(newSelectedAnimationGroups);
		} else {
			setSelectedAnimationGroups([animationGroup]);
		}
	}

	function handlePlayOrStopAnimationGroup(animationGroup: AnimationGroup) {
		if (animationGroup.isPlaying) {
			animationGroup.stop();
			setPlayingAnimationGroups(playingAnimationGroups.filter((ag) => ag !== animationGroup));
		} else {
			animationGroup.play(true);
			setPlayingAnimationGroups([...playingAnimationGroups, animationGroup]);
		}
	}

	function handlePlaySelectedAnimationGroups() {
		props.scene.animationGroups.forEach((animationGroup) => {
			animationGroup.stop();
		});

		selectedAnimationGroups.forEach((animationGroup) => {
			animationGroup.play(true);
		});

		setPlayingAnimationGroups(props.scene.animationGroups.filter((animationGroup) => animationGroup.isPlaying));
	}

	function handleRemoveSelectedAnimationGroups() {
		registerUndoRedo({
			executeRedo: true,
			undo: () => {
				selectedAnimationGroups.forEach((animationGroup) => {
					props.scene.addAnimationGroup(animationGroup);
				});
			},
			redo: () => {
				selectedAnimationGroups.forEach((animationGroup) => {
					props.scene.removeAnimationGroup(animationGroup);
				});
			},
		});

		setAnimationGroups(props.scene.animationGroups.slice());
	}

	async function handleMergeSelectedAnimationGroups() {
		const name = await showPrompt("Merge Animation Groups", "Enter a name for the merged animation group", "Merged Animation Group");
		if (!name) {
			return;
		}

		const animationGroup = new AnimationGroup(name, props.scene);

		selectedAnimationGroups.forEach((ag) => {
			ag.targetedAnimations.forEach((targetedAnimation) => {
				animationGroup.addTargetedAnimation(targetedAnimation.animation, targetedAnimation.target);
			});
		});

		setSelectedAnimationGroups([animationGroup]);
		setAnimationGroups(props.scene.animationGroups.slice());
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
						values={props.scene.animationGroups}
						onReorder={(items) => {
							setAnimationGroups(items);
							props.scene.animationGroups = items;
						}}
						className="flex flex-col rounded-lg bg-black/50 text-white/75 h-96 overflow-y-auto"
					>
						{animations.map((animationGroup) => (
							<Reorder.Item key={`${animationGroup.name}`} value={animationGroup} id={`${animationGroup.name}`}>
								<ContextMenu>
									<ContextMenuTrigger>
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
									</ContextMenuTrigger>
									<ContextMenuContent>
										<ContextMenuItem className="flex items-center gap-2" onClick={handleMergeSelectedAnimationGroups}>
											<AiFillMerge className="w-5 h-5" /> Merge...
										</ContextMenuItem>
										<ContextMenuSeparator />
										<ContextMenuItem className="flex items-center gap-2 !text-red-400" onClick={handleRemoveSelectedAnimationGroups}>
											<AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> Remove
										</ContextMenuItem>
									</ContextMenuContent>
								</ContextMenu>
							</Reorder.Item>
						))}
					</Reorder.Group>
				</>
			)}
		</EditorInspectorSectionField>
	);
}

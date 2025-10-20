import { Node, Light, AbstractMesh, Scene, IParticleSystem, Sound, SoundTrack, Sprite } from "babylonjs";

import { unique } from "../../../tools/tools";
import { isSound } from "../../../tools/guards/sound";
import { isSprite } from "../../../tools/guards/sprites";
import { registerUndoRedo } from "../../../tools/undoredo";
import { updateAllLights } from "../../../tools/light/shadows";
import { isAnyParticleSystem } from "../../../tools/guards/particles";
import { isAdvancedDynamicTexture } from "../../../tools/guards/texture";
import { getLinkedAnimationGroupsFor } from "../../../tools/animation/group";
import { isNode, isMesh, isAbstractMesh, isInstancedMesh, isCollisionInstancedMesh, isLight, isCamera, isAnyTransformNode } from "../../../tools/guards/nodes";

import { Editor } from "../../main";

type _RemoveNodeData = {
	node: Node;
	parent: Node | null;

	lights: Light[];
	sounds: {
		sound: Sound;
		soundtrack?: SoundTrack;
	}[];
	particleSystems: IParticleSystem[];
};

/**
 * Removes the currently selected nodes in the graph with undo/redo support.
 * @param editor defines the reference to the editor used to get the selected nodes and refresh the graph.
 */
export function removeNodes(editor: Editor) {
	const scene = editor.layout.preview.scene;

	const allData = editor.layout.graph
		.getSelectedNodes()
		.filter((n) => n.nodeData)
		.map((n) => n.nodeData);

	const nodes = allData
		.filter((n) => isNode(n))
		.map((node) => {
			const attached = [node]
				.concat(node.getDescendants(false, (n) => isNode(n)))
				.map((descendant) => (isMesh(descendant) ? [descendant, ...descendant.instances] : [descendant]))
				.flat()
				.map((descendant) => {
					return {
						node: descendant,
						parent: descendant.parent,
						particleSystems: scene.particleSystems.filter((ps) => ps.emitter === descendant),
						sounds:
							scene.soundTracks
								?.map((soundTrack) =>
									soundTrack.soundCollection
										.filter((sound) => sound.spatialSound && sound["_connectedTransformNode"] === descendant)
										.map((sound) => ({
											sound,
											soundtrack: scene.soundTracks?.[sound.soundTrackId + 1],
										}))
								)
								.flat() ?? [],
						lights: scene.lights.filter((light) => {
							return light
								.getShadowGenerator()
								?.getShadowMap()
								?.renderList?.includes(descendant as AbstractMesh);
						}),
					} as _RemoveNodeData;
				});

			return attached;
		})
		.flat();

	const sounds = unique(
		nodes
			.map((d) => d.sounds)
			.flat()
			.concat(
				allData
					.filter((d) => isSound(d))
					.map((sound) => ({
						sound,
						soundtrack: scene.soundTracks?.[sound.soundTrackId + 1],
					}))
			)
	);

	const particleSystems = unique(
		nodes
			.map((d) => d.particleSystems)
			.flat()
			.concat(allData.filter((d) => isAnyParticleSystem(d)))
	);

	const sprites = allData.filter((d) => isSprite(d)) as Sprite[];
	const advancedGuiTextures = allData.filter((d) => isAdvancedDynamicTexture(d));
	const animationGroups = getLinkedAnimationGroupsFor([...particleSystems, ...advancedGuiTextures, ...sounds.map((d) => d.sound), ...nodes.map((d) => d.node)], scene);

	registerUndoRedo({
		executeRedo: true,
		action: () => {
			editor.layout.graph.refresh();
			editor.layout.preview.gizmo.setAttachedObject(null);
			editor.layout.inspector.setEditedObject(editor.layout.preview.scene);

			updateAllLights(scene);
		},
		undo: () => {
			nodes.forEach((d) => {
				restoreNodeData(d, scene);
			});

			sounds.forEach((d) => {
				d.soundtrack?.addSound(d.sound);
			});

			particleSystems.forEach((particleSystem) => {
				scene.addParticleSystem(particleSystem);
			});

			sprites.forEach((sprite) => {
				sprite.manager.sprites.push(sprite);
			});

			advancedGuiTextures.forEach((node) => {
				scene.addTexture(node);

				const layer = scene.layers.find((layer) => layer.texture === node);
				if (layer) {
					layer.isEnabled = true;
				}
			});

			animationGroups.forEach((targetedAnimations, animationGroup) => {
				targetedAnimations.forEach((targetedAnimation) => {
					animationGroup.addTargetedAnimation(targetedAnimation.animation, targetedAnimation.target);
				});

				if (!scene.animationGroups.includes(animationGroup)) {
					scene.addAnimationGroup(animationGroup);
				}
			});
		},
		redo: () => {
			nodes.forEach((d) => {
				removeNodeData(d, scene);
			});

			sounds.forEach((d) => {
				d.soundtrack?.removeSound(d.sound);
			});

			particleSystems.forEach((particleSystem) => {
				scene.removeParticleSystem(particleSystem);
			});

			sprites.forEach((sprite) => {
				const index = sprite.manager.sprites.indexOf(sprite);
				if (index !== -1) {
					sprite.manager.sprites.splice(index, 1);
				}
			});

			advancedGuiTextures.forEach((node) => {
				scene.removeTexture(node);

				const layer = scene.layers.find((layer) => layer.texture === node);
				if (layer) {
					layer.isEnabled = false;
				}
			});

			animationGroups.forEach((targetedAnimations, animationGroup) => {
				targetedAnimations.forEach((targetedAnimation) => {
					animationGroup.removeTargetedAnimation(targetedAnimation.animation);
				});

				if (!animationGroup.targetedAnimations.length) {
					scene.removeAnimationGroup(animationGroup);
				} else {
					console.log(nodes.find((d) => d.node === animationGroup.targetedAnimations[0].target));
				}
			});
		},
	});
}

function restoreNodeData(data: _RemoveNodeData, scene: Scene) {
	const node = data.node;

	if (isAbstractMesh(node)) {
		if (isInstancedMesh(node) || isCollisionInstancedMesh(node)) {
			node.sourceMesh.addInstance(node);
		}

		scene.addMesh(node);

		data.lights.forEach((light) => {
			light.getShadowGenerator()?.getShadowMap()?.renderList?.push(node);
		});
	}

	if (isAnyTransformNode(node)) {
		scene.addTransformNode(node);
	}

	if (isLight(node)) {
		scene.addLight(node);
	}

	if (isCamera(node)) {
		scene.addCamera(node);
	}
}

function removeNodeData(data: _RemoveNodeData, scene: Scene) {
	const node = data.node;

	if (isAbstractMesh(node)) {
		if (isInstancedMesh(node) || isCollisionInstancedMesh(node)) {
			node.sourceMesh.removeInstance(node);
		}

		scene.removeMesh(node);

		data.lights.forEach((light) => {
			const renderList = light.getShadowGenerator()?.getShadowMap()?.renderList;
			const index = renderList?.indexOf(node) ?? -1;
			if (index !== -1) {
				renderList?.splice(index, 1);
			}
		});
	}

	if (isAnyTransformNode(node)) {
		scene.removeTransformNode(node);
	}

	if (isLight(node)) {
		scene.removeLight(node);
	}

	if (isCamera(node)) {
		scene.removeCamera(node);
	}
}

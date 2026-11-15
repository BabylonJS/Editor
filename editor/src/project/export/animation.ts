import { Scene } from "babylonjs";

export function configureAnimationGroups(data: any, scene: Scene) {
	data.animationGroups = data.animationGroups?.filter((animationGroup: any) => {
		const existing = scene.getAnimationGroupByName(animationGroup.name);
		if (existing && existing.doNotSerialize) {
			return false;
		}

		return true;
	});
}

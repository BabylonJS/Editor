export function configureMaterials(data: any) {
	if (!data.materials) {
		return;
	}

	data.materials = data.materials.filter((material: any) => {
		if (material.customType === "BABYLON.ShaderMaterial") {
			return false;
		}

		return true;
	});
}

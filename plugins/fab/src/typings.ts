export interface IFabJson {
	id: string;
	path: string;

	materials: IFabMaterialJson[];
	meshes: IFabMeshJson[];

	metadata: IFabMetadataJson;
}

export interface IFabMaterialJson {
	file: string;
	flipnmapgreenchannel: boolean;
	name: string;
	textures: IFabMaterialTextureJson;
}

export interface IFabMaterialTextureJson {
	albedo?: string;
	bump?: string;
	normal?: string;
	orm?: string;
	glossiness?: string;
	occlusion?: string;
	roughness?: string;
	specular?: string;
	metal?: string;
}

export interface IFabMeshJson {
	file: string;
	name: string;
	material_index: number;
}

export interface IFabMetadataJson {
	fab: {
		listing: {
			title: string;
		};
	};
}

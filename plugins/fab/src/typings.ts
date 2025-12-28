export interface IFabJson {
	id: string;
	path: string;

	materials: IFabMaterialJson[];
	meshes: IFabMeshJson[];

	metadata: IFabMetadataJson;

	additional_textures: string[];
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
	opacity?: string;
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
			thumbnail: string;
			description: string;

			lastUpdatedAt: string;
			publishedAt: string;

			isAiForbidden: boolean;
			isAiGenerated: boolean;
		};
	};
}

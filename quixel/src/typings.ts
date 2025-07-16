export type QuixelJsonType = {
    path: string;
    type: string;
    name: string;
    lodList: QuixelLodListType[];
    components: QuixelComponentType[];
    packedTextures: QuixelPackTextureType[];

    previewImage?: string;
};

export type QuixelLodListType = {
    lod: string;
    path: string;

    variation?: number;
};

export type QuixelComponentType = {
    type: string;
    name: string;
    path: string;
};

export type QuixelPackTextureType = {
    type: string;
    name: string;
    path: string;
};

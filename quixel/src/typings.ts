export type QuixelJsonType = {
    path: string;
    type: string;
    name: string;
    lodList: QuixelLodListType[];
    components: QuixelComponentType[];
    packedTextures: QuixelPackTextureType[];
};

export type QuixelLodListType = {
    lod: string;
    path: string;
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

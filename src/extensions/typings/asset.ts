export interface AssetElement<T> {
    img?: string;
    name?: string;
    data?: T;
}

export interface IAssetComponent {
    id?: string;
    assetsCaption?: string;
    onGetAssets?<T> (): AssetElement<T>[] | Promise<AssetElement<T>[]>;
}

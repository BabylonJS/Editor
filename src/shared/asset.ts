import { AbstractMesh } from 'babylonjs';

export interface AssetElement<T> {
    img?: string;
    name?: string;
    data?: T;
}

export interface IAssetComponent {
    id?: string;
    assetsCaption?: string;
    onGetAssets?<T> (): AssetElement<T>[] | Promise<AssetElement<T>[]>;
    onRemoveAsset?<T> (asset: AssetElement<T>): void;
    onAddAsset?<T> (asset: AssetElement<T>): void;
    onDragAndDropAsset?<T> (targetMesh: AbstractMesh, asset: AssetElement<T>): void;
}

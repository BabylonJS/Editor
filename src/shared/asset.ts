import { AbstractMesh, PickingInfo } from 'babylonjs';

export interface AssetElement<T> {
    img?: string;
    name?: string;
    data?: T;
}

export interface IAssetComponent {
    id?: string;
    assetsCaption?: string;
    size?: number;
    onGetAssets? (): AssetElement<any>[] | Promise<AssetElement<any>[]>;
    onRemoveAsset? (asset: AssetElement<any>): void;
    onAddAsset? (asset: AssetElement<any>): void;
    onDragAndDropAsset? (targetMesh: AbstractMesh, asset: AssetElement<any>, pickInfo?: PickingInfo): void;

    onSerializeAssets? (): AssetElement<any>[];
    onParseAssets? (data: AssetElement<any>[]): void;
}

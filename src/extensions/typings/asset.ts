import { AbstractMesh, PickingInfo } from 'babylonjs';

export interface AssetElement<T> {
    img?: string;
    name?: string;
    data?: T;
    separator?: string;
}

export interface AssetContextMenu {
    id: string;
    text: string;
    img?: string;
    callback?: (asset?: AssetElement<any>) => void;
}

export interface IAssetFile {
    /**
     * The name of the file to write, including folder.
     */
    name: string;
    /**
     * The content of the file to write.
     */
    content: string | ArrayBuffer;
}

export interface IAssetExportConfiguration {
    es6: boolean;
}

export interface IAssetComponent {
    id?: string;
    assetsCaption?: string;
    size?: number;

    onCreateAsset? (name: string): AssetElement<any> | Promise<AssetElement<any>>;
    onRenameAsset? (asset: AssetElement<any>, name: string): void;

    onGetAssets? (): AssetElement<any>[] | Promise<AssetElement<any>[]>;
    
    onRemoveAsset? (asset: AssetElement<any>): void;
    onAddAsset? (asset: AssetElement<any>): void;
    
    onDragAndDropAsset? (targetMesh: AbstractMesh, asset: AssetElement<any>, pickInfo?: PickingInfo): void;
    onDoubleClickAsset? (asset: AssetElement<any>): void;
    onContextMenu? (): AssetContextMenu[];

    onSerializeAssets? (): AssetElement<any>[];
    onParseAssets? (data: AssetElement<any>[]): void;

    /**
     * Called by the editor when serializing final assets.
     */
    onSerializeFinalFiles? (configuration: IAssetExportConfiguration): IAssetFile[] | Promise<IAssetFile[]>;
}

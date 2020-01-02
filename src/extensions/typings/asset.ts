import { AbstractMesh, PickingInfo, Observer } from 'babylonjs';

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
     * The file reference to write.
     */
    file?: File;
    /**
     * The data to write in file.
     */
    data?: string | ArrayBuffer | Uint8Array;
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
    onParseAssets? (data: AssetElement<any>[]): Promise<void> | void;

    /**
     * Called on the user drag'n'drops files in the assets component.
     */
    onDragAndDropFiles? (files: FileList): Promise<void> | void;
    /**
     * Reference to the drag'n'drop files observer.
     * @hidden
     */
    _onDragAndDropFilesObserver?: Observer<any>;

    /**
     * Called by the editor when serializing the project (used when saving project).
     */
    onSerializeFiles? (): IAssetFile[] | Promise<IAssetFile[]>;
    /**
     * Called by the editor when serializing final assets.
     */
    onSerializeFinalFiles? (configuration: IAssetExportConfiguration): IAssetFile[] | Promise<IAssetFile[]>;
}

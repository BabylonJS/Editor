import { Tools as BabylonTools } from 'babylonjs';

import Editor from '../editor';

import Tools from '../tools/tools';
import Window from '../gui/window';

import { AssetElement, IAssetComponent } from '../../extensions/typings/asset';

interface _AssetImage<T> {
    element: HTMLImageElement;
    asset: AssetElement<T>;
}

export default class AssetPicker {
    private static _DefaultImageSource: string = null;
    private static _SelectedAsset: AssetElement<any> = null;
    private static _Images: _AssetImage<any>[] = [];

    /**
     * Shows the texture picker and returns the selected texture.
     * @param scene the scene containing the textures to pick.
     * @param selectedTexture the texture reference that must be selected by default in the list.
     * @param allowCubes if the cube textures should be displayed in the list.
     * @param onlyCubes if only cube textures should be displayed in the list.
     */
    public static async Show<T> (editor: Editor, component: IAssetComponent): Promise<AssetElement<T>> {
        // Reset
        this._SelectedAsset = null;
        this._Images = [];

        // Check default image source
        if (!this._DefaultImageSource) {
            const file = await Tools.GetFile('assets/textures/waitlogo.png');
            this._DefaultImageSource = await Tools.ReadFileAsBase64(file);
        }

        // Create window
        const win = new Window('AssetPicker');
        win.body = `
            <input id="ASSET-PICKER-SEARCH" placeholder="Search..." style="width: 100%; height: 35px;" />
            <div id="ASSET-PICKER" style="width: 100%; height: calc(100% - 35px);"></div>
        `;
        win.title = 'Choose Asset...';
        win.buttons = ['Ok', 'Cancel'];
        await win.open();

        // Return
        return new Promise<AssetElement<T>>((resolve, reject) => {
            // Fill
            this._Fill(editor, component, (asset: AssetElement<T>) => {
                // The user double-clicked a texture
                resolve(asset);
                win.close();
            });

             // On window close
             win.onClose = () => reject('User decided to not select any texture.');

            // On window button click
            win.onButtonClick = (id => {
                if (id === 'Cancel') {
                    win.close();
                    return reject('User decided to not select any asset.');
                }

                if (!this._SelectedAsset)
                    return;
                
                resolve(this._SelectedAsset);
                win.close();
            });
        });
    }

    // Fills the available textures.
    private static async _Fill<T> (editor: Editor, component: IAssetComponent, callback: (texture: AssetElement<T>) => void): Promise<void> {
        // Add images
        const rootDiv = $('#ASSET-PICKER')[0];
        const assets = await component.onGetAssets();

        assets.forEach((a) => {
            // Elements
            const parent = Tools.CreateElement<HTMLDivElement>('div', a.name, {
                'position': 'relative',
                'width': '100px',
                'height': '100px',
                'float': 'left',
                'margin': '10px'
            });

            const title = Tools.CreateElement<HTMLElement>('small', BabylonTools.RandomId(), {
                'float': 'left',
                'width': '100px',
                'left': '50%',
                'top': '8px',
                'transform': 'translate(-50%, -50%)',
                'text-overflow': 'ellipsis',
                'white-space': 'nowrap',
                'overflow': 'hidden',
                'position': 'relative'
            });
            title.innerText = a.name;

            const img = Tools.CreateElement<HTMLImageElement>('img', BabylonTools.RandomId(), {
                'width': '100px',
                'height': '100px'
            });
            img.src = a.img || this._DefaultImageSource;

            this._Images.push({ element: img, asset: a });

            // Events
            img.addEventListener('click', ev => {
                // Remove "selected" state
                this._HighLight(img);

                // Keep selected
                this._SelectedAsset = a;
            });

            img.addEventListener('dblclick', ev => {
                this._SelectedAsset = a;
                callback(a);
            });

            // Add
            parent.appendChild(img);
            parent.appendChild(title);
            rootDiv.appendChild(parent);
        });

        // Search
        const search = $('#TEXTURE-PICKER-SEARCH');
        search.keyup(ev => {
            const val = (<string> search.val()).toLowerCase();

            // Show / hide
            this._Images.forEach(img => {
                if (img.element.id.toLowerCase().indexOf(val) === -1)
                    $(img.element.parentElement).hide();
                else
                    $(img.element.parentElement).show();
            });

            // Find first
            const first = this._Images.find(i => !$(i.element).is(':hidden'));
            if (first) {
                this._SelectedAsset = first.asset;
                this._HighLight(first.element);
            }

            // Pressed enter?
            if (ev.keyCode === 13)
                callback(this._SelectedAsset);
        });
        setTimeout(() => search.focus(), 1);
    }

    // Highlights the given image
    private static _HighLight (image: HTMLImageElement): void {
        // Remove "selected" state
        this._Images.forEach(img => {
            img.element.style.backgroundColor = '';
            img.element.style.borderRadius = '';
            img.element.style.border = '';
        });

        // Apply "selected" state
        image.style.backgroundColor = 'rgba(0, 0, 0, 0.25)';
        image.style.borderRadius = '10px';
        image.style.border = '5px solid grey';
    }
}

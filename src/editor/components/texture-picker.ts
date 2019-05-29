import { Scene, Texture, CubeTexture, FilesInputStore, BaseTexture } from 'babylonjs';

import Window from '../gui/window';
import Tools from '../tools/tools';

interface _TextureImage {
    element: HTMLImageElement;
    texture: BaseTexture;
}

export default class TexturePicker {
    private static _DefaultImageSource: string = null;
    private static _SelectedTexture: BaseTexture = null;
    private static _Images: _TextureImage[] = [];

    /**
     * Shows the texture picker and returns the selected texture.
     * @param scene the scene containing the textures to pick.
     * @param selectedTexture the texture reference that must be selected by default in the list.
     * @param allowCubes if the cube textures should be displayed in the list.
     * @param onlyCubes if only cube textures should be displayed in the list.
     */
    public static async Show (scene: Scene, selectedTexture: BaseTexture = null, allowCubes: boolean = false, onlyCubes: boolean = false): Promise<BaseTexture> {
        // Reset
        this._SelectedTexture = selectedTexture;
        this._Images = [];

        // Check default image source
        if (!this._DefaultImageSource) {
            const file = await Tools.GetFile('assets/textures/waitlogo.png');
            this._DefaultImageSource = await Tools.ReadFileAsBase64(file);
        }

        // Create window
        const win = new Window('TexturePicker');
        win.body = `
            <input id="TEXTURE-PICKER-SEARCH" placeholder="Search..." style="width: 100%; height: 35px;" />
            <div id="TEXTURE-PICKER" style="width: 100%; height: calc(100% - 35px);"></div>
        `;
        win.title = 'Choose Texture...';
        win.buttons = ['Ok', 'Cancel'];
        await win.open();

        // Return
        return new Promise<BaseTexture>((resolve, reject) => {
            // Fill
            this._Fill(scene, selectedTexture, allowCubes, onlyCubes, (texture) => {
                // The user double-clicked a texture
                resolve(texture);
                win.close();
            });

            // On window close
            win.onClose = () => reject('User decided to not select any texture.');

            // On window button click
            win.onButtonClick = (id => {
                if (id === 'Cancel') {
                    win.close();
                    return reject('User decided to not select any texture.');
                }

                if (!this._SelectedTexture)
                    return;
                
                resolve(this._SelectedTexture);
                win.close();
            });
        });
    }

    // Fills the available textures.
    private static _Fill (scene: Scene, selectedTexture: BaseTexture, allowCubes: boolean, onlyCubes: boolean, callback: (texture: BaseTexture) => void): void {
        // Add images
        const rootDiv = $('#TEXTURE-PICKER')[0];

        scene.textures.forEach(texture => {
            // Check
            if (!allowCubes && texture instanceof CubeTexture)
                return;

            if (onlyCubes && !(texture instanceof CubeTexture))
                return;

            // Elements
            const parent = Tools.CreateElement<HTMLDivElement>('div', texture.name + texture.uniqueId + 'div', {
                'position': 'relative',
                'width': '100px',
                'height': '100px',
                'float': 'left',
                'margin': '10px'
            });

            const title = Tools.CreateElement<HTMLElement>('small', texture.name + 'text', {
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
            title.innerText = texture.name;

            const img = Tools.CreateElement<HTMLImageElement>('img', texture.name, {
                'width': '100px',
                'height': '100px'
            });
            this._Images.push({
                element: img,
                texture: texture
            });

            // Highlight?
            if (texture === selectedTexture)
                this._HighLight(img);

            // If cube texture, not yet supported.
            if (texture instanceof CubeTexture || !texture['url']) {
                img.src = this._DefaultImageSource;
            }
            // Texture, try to find the file.
            else if (texture instanceof Texture) {
                const url = texture.url.replace('file:', '').toLowerCase();
                const file = FilesInputStore.FilesToLoad[url];
                if (file) {
                    const url = URL.createObjectURL(file);
                    img.src = url;
                    img.onload = (() => {
                        URL.revokeObjectURL(url);
                    });
                }
                else {
                    img.src = this._DefaultImageSource;
                }
            }

            // Events
            img.addEventListener('click', ev => {
                // Remove "selected" state
                this._HighLight(img);

                // Keep selected
                this._SelectedTexture = texture;
            });

            img.addEventListener('dblclick', ev => {
                this._SelectedTexture = texture;
                callback(texture);
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
                this._SelectedTexture = first.texture;
                this._HighLight(first.element);
            }

            // Pressed enter?
            if (ev.keyCode === 13)
                callback(this._SelectedTexture);
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

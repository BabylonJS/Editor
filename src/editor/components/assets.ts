import { Tools as BabylonTools } from 'babylonjs';

import Editor from '../editor';

import Tools from '../tools/tools';
import UndoRedo from '../tools/undo-redo';

import ContextMenu, { ContextMenuItem } from '../gui/context-menu';
import Layout from '../gui/layout';
import Toolbar from '../gui/toolbar';
import Dialog from '../gui/dialog';

import { IAssetComponent, AssetElement } from '../../extensions/typings/asset';

import PrefabAssetComponent from '../prefabs/asset-component';
import ParticlesAssetComponent from '../particles/asset-component';
import MeshesLibrary from "../libraries/meshes";

import VSCodeSocket from '../extensions/vscode-socket';
import { IStringDictionary } from '../typings/typings';

export interface AssetPreviewData {
    asset: AssetElement<any>;
    img: HTMLImageElement;
    title: HTMLElement;
    parent: HTMLDivElement;
}

export default class EditorAssets {
    // Public members
    public tabs: W2UI.W2Tabs;
    public layout: Layout;
    public toolbar: Toolbar;

    public components: IAssetComponent[] = [];

    public prefabs: PrefabAssetComponent;
    public particles: ParticlesAssetComponent;
    public meshes: MeshesLibrary;

    public assetPreviewDatas: AssetPreviewData[] = [];

    // Protected members
    protected currentComponent: IAssetComponent = null;
    protected emptyTextNode: HTMLHeadElement = null;

    // Private members
    private _search: string = '';

    // Static members
    private static _DefaultImageSource: string = null;

    /**
     * Constructor
     * @param editor the editore reference
     */
    constructor (protected editor: Editor) {
        // Layout
        this.layout = new Layout('ASSETS-LAYOUT');
        this.layout.panels = [
            { type: 'top', size: 30, content: '<div id="ASSETS-TOOLBAR" style="width: 100%; height: 100%;"></div>', resizable: false },
            { type: 'main', content: '<div id="ASSETS-CONTENT" style="width: 100%; height: 100%;"></div>' }
        ];
        this.layout.build('ASSETS');

        // Toolbar
        this.toolbar = new Toolbar('ASSETS-TOOLBAR');
        this.toolbar.items = [
            { type: 'button', id: 'add', text: 'Add', img: 'icon-add' }
        ];
        this.toolbar.right = `
            <div style="padding: 3px 10px;">
                <input placeholder="Search..." size="25" id="ASSETS-SEARCH" class="editorSearch" style="height: 20px; padding: 3px; border: 1px solid silver; border-radius: 45px;" value="" />
            </div>`;
        this.toolbar.onClick = id => this.toolbarClicked(id);
        this.toolbar.build('ASSETS-TOOLBAR');

        // Search
        const search = $('#ASSETS-SEARCH');
        search.keyup(() => {
            this._search = <string> search.val();
            this.refresh();
        });

        // Tabs
        this.tabs = $('#ASSETS-CONTENT').w2tabs({
            name: 'ASSETS-CONTENT'
        });

        // Create components
        this.prefabs = new PrefabAssetComponent(editor);
        this.particles = new ParticlesAssetComponent(editor);
        this.meshes = new MeshesLibrary(editor);

        // Add components tabs
        this.addDefaultComponents();

        // Finalize
        this.showTab(this.currentComponent.id);
        this.refresh();
    }

    /**
     * Clears the assets components
     */
    public clear (): void {
        this.components.forEach(c => {
            $('#' + c.id).remove();
            this.tabs.remove(c.id);

            if (c._onDragAndDropFilesObserver) {
                this.editor.core.onDropFiles.remove(c._onDragAndDropFilesObserver);
                c._onDragAndDropFilesObserver = null;
            }
        });

        this.components = [];
        this.assetPreviewDatas = [];
        this.currentComponent = null;

        if (this.emptyTextNode) {
            this.emptyTextNode.remove();
            this.emptyTextNode = null;
        }

        this.addDefaultComponents();
    }

    /**
     * Adds the default components
     */
    public addDefaultComponents (): void {
        this.addTab(this.prefabs);
        this.addTab(this.particles);
        this.addTab(this.meshes);
    }

    /**
     * Refreshes the tabs
     */
    public async refresh (id?: string): Promise<void> {
        // Check default image source
        if (!EditorAssets._DefaultImageSource) {
            const file = await Tools.GetFile('assets/textures/waitlogo.png');
            EditorAssets._DefaultImageSource = await Tools.ReadFileAsBase64(file);
        }

        // Empty?
        if (this.components.length === 0) {
            this.emptyTextNode = Tools.CreateElement<HTMLHeadElement>('h1', BabylonTools.RandomId(), {
                'float': 'left',
                'left': '50%',
                'top': '50%',
                'transform': 'translate(-50%, -50%)',
                'overflow': 'hidden',
                'position': 'relative',
                'font-family': 'Roboto,sans-serif !important',
                'opacity': '0.5'
            });
            this.emptyTextNode.textContent = 'Empty';

            $('#ASSETS-CONTENT').append(this.emptyTextNode);

            return;
        }

        // Remove empty text
        if (this.emptyTextNode) {
            this.emptyTextNode.remove();
            this.emptyTextNode = null;
        }

        // Refresh each component
        this.components.forEach(async (c) => {
            if (id && c.id !== id)
                return;

            // Drag'n'drop?
            if (c._onDragAndDropFilesObserver) {
                this.editor.core.onDropFiles.remove(c._onDragAndDropFilesObserver);
                c._onDragAndDropFilesObserver = null;
            }

            if (c.onDragAndDropFiles) {
                c._onDragAndDropFilesObserver = this.editor.core.onDropFiles.add(async (files) => {
                    if (files.target !== $("#" + c.id)[0])
                        return;
                    
                    await c.onDragAndDropFiles(files.files);
                    this.refresh(c.id);
                });
            }

            // Get assets to draw in component.
            const assets = 
                (await c.onGetAssets())
                .filter(a => a.name && a.name.toLowerCase().indexOf(this._search.toLowerCase()) !== -1 || a.separator);

            const div = $('#' + c.id);

            // Clear
            while (div[0].children.length > 0)
                div[0].children[0].remove();

            // Empty or not
            if (assets.length === 0) {
                const emptyTextNode = Tools.CreateElement<HTMLHeadElement>('h1', BabylonTools.RandomId(), {
                    'float': 'left',
                    'left': '50%',
                    'top': '50%',
                    'transform': 'translate(-50%, -50%)',
                    'overflow': 'hidden',
                    'position': 'relative',
                    'font-family': 'Roboto,sans-serif !important',
                    'opacity': '0.5'
                });
                emptyTextNode.textContent = this._search !== '' ? 'No results found' : 'Empty';
    
                $('#' + c.id).append(emptyTextNode);
            }

            // Add elements
            const assetSize = (c.size || 50) + 'px';
            assets.forEach(a => {
                // Separator?
                if (a.separator) {
                    const separator = Tools.CreateElement<HTMLHRElement>('hr', a.separator, {
                        'float': 'left',
                        'margin': '10px',
                        'width': '100%'
                    });
                    separator.setAttribute('hr-content', a.separator);
                    div.append(separator);
                    return;
                }

                // Pickable asset
                const parent = Tools.CreateElement<HTMLDivElement>('div', c.id + a.name + 'div', {
                    'position': 'relative',
                    'width': assetSize,
                    'height': assetSize,
                    'float': 'left',
                    'margin': '10px'
                });

                const title = Tools.CreateElement<HTMLElement>('small', a.name + 'text', {
                    'float': 'left',
                    'width': assetSize,
                    'left': '50%',
                    'top': '8px',
                    'transform': 'translate(-50%, -50%)',
                    'text-overflow': 'ellipsis',
                    'white-space': 'nowrap',
                    'overflow': 'hidden',
                    'position': 'relative'
                });

                const img = Tools.CreateElement<HTMLImageElement>('img', a.name, {
                    'width': assetSize,
                    'height': assetSize
                });
                img.classList.add('ctxmenu');

                // Configure
                title.innerText = a.name;
                img.src = a.img || EditorAssets._DefaultImageSource;

                // Events
                img.addEventListener('click', ev => {
                    this.highlight(img);
                    this.editor.core.onSelectAsset.notifyObservers(a.data);
                });
                
                c.onDoubleClickAsset && img.addEventListener('dblclick', ev => {
                    c.onDoubleClickAsset(a);
                });

                ContextMenu.ConfigureElement(img, this.getContextMenuItems(c, a), () => {
                    this.highlight(img);
                    this.editor.core.onSelectAsset.notifyObservers(a.data);
                });

                img.addEventListener('dblclick', async (ev) => {
                    const config = System.getConfig();
                    if (!config.paths[c.id])
                        return;
                    
                    await this.editor.addEditPanelPlugin(c.id, false);
                    this.editor.core.onSelectAsset.notifyObservers(a.data);
                });

                // Drag'n'drop
                if (c.onDragAndDropAsset) {
                    const dropListener = this.dragEnd(c, a);
                    img.addEventListener('dragstart', () => {
                        this.editor.core.engine.getRenderingCanvas().addEventListener('drop', dropListener);
                    });
            
                    img.addEventListener('dragend', () => {
                        this.editor.core.engine.getRenderingCanvas().removeEventListener('drop', dropListener);
                    });
                }

                // Add
                parent.appendChild(img);
                parent.appendChild(title);
                div.append(parent);

                // Register
                this.assetPreviewDatas.push({
                    asset: a,
                    img: img,
                    title: title,
                    parent: parent
                });
            });
        });

        // Update VSCode extension as it is designed to edit
        // assets from the editor project
        // TODO: uncomment
        // VSCodeSocket.Refresh();
    }

    /**
     * Adds a new tab to draw components
     * @param component the component to add in assets panel
     */
    public addTab (component: IAssetComponent): void {
        // Check if exists
        const exists = this.components.find(c => c === component);
        if (exists)
            return;
        
        // Add tab's div
        $('#ASSETS-CONTENT').append('<div id="' + component.id + '" style="width: 100%; height: 100%; overflow: auto;"></div>');

        // Add tab
        this.tabs.add({
            id: component.id,
            caption: component.assetsCaption,
            closable: false,
            onClick: (event) => this.showTab(event.target)
        });

        if (!this.currentComponent)
            this.currentComponent = component;
        else
            $('#' + component.id).hide();

        // Save component and refresh
        this.components.push(component);
        this.refresh(component.id);
    }

    /**
     * Shows the tab identified by the given id
     * @param id the id of the tab to show
     */
    public showTab (id: string): void {
        if (this.currentComponent)
            $('#' + this.currentComponent.id).hide();

        this.currentComponent = this.components.find(c => c.id === id);
        $('#' + this.currentComponent.id).show();
        this.tabs.select(id);

        // Toolbar
        this.currentComponent.onCreateAsset ? this.toolbar.element.show('add') : this.toolbar.element.hide('add');
    }

    /**
     * Returns the asset preview data from the given asset element
     * @param asset the source asset
     */
    public getAssetPreviewData (asset: AssetElement<any>): AssetPreviewData {
        return this.assetPreviewDatas.find(apd => apd.asset === asset);
    }

    /**
     * Adds a new asset to the assets store
     * @param component the component used to add an asset
     */
    public async addAsset (component?: IAssetComponent): Promise<AssetElement<any>> {
        if (!component)
            component = this.currentComponent;

        if (component && component.onCreateAsset) {
            const name = await Dialog.CreateWithTextInput('New asset name');
            const asset = await component.onCreateAsset(name);

            this.showTab(component.id);
            this.refresh(component.id);

            return asset;
        }

        return null;
    }

    /**
     * Returns the drag end event function
     * @param component the source component
     * @param asset the dropped asset
     */
    protected dragEnd (component: IAssetComponent, asset: AssetElement<any>): (ev: DragEvent) => void {
        return (ev: DragEvent) => {
            const scene = this.editor.core.scene;
            const pick = scene.pick(ev.offsetX, ev.offsetY);

            if (!pick.pickedMesh)
                return;

            component.onDragAndDropAsset(pick.pickedMesh, asset, pick);
            this.editor.core.onSelectObject.notifyObservers(pick.pickedMesh);
            this.editor.graph.configure();
            this.refresh(component.id);
        };
    }

    /**
     * On the user clicks on the toolbar
     * @param id the id of the clicked item
     */
    protected async toolbarClicked (id: string): Promise<void> {
        switch (id) {
            case 'add':
                this.addAsset();

                break;
            default: break;
        }
    }

    /**
     * Hightlights the given image element
     * @param img the image element to highlight
     */
    protected highlight (img: HTMLImageElement): void {
        this.assetPreviewDatas.forEach(apd => {
            if (apd.img) {
                apd.img.style.backgroundColor = '';
                apd.img.style.borderRadius = '';
            }
        });

        img.style.backgroundColor = 'rgba(0, 0, 0, 0.25)';
        img.style.borderRadius = '10px';
    }

    /**
     * Processes the context menu for the clicked item
     * @param ev the mouse event object
     * @param component the component being modified
     * @param asset the target asset
     */
    protected getContextMenuItems (component: IAssetComponent, asset: AssetElement<any>): IStringDictionary<ContextMenuItem> {
        if (!component.onRemoveAsset)
            return;
        
        // Configure
        const items: IStringDictionary<ContextMenuItem> = { };

        const assetItems = ((component.onContextMenu && component.onContextMenu()) || []);
        assetItems.forEach(i => items[i.id] = { name: i.text, callback: () => i.callback(asset) });
        
        component.onRenameAsset && (items.rename = { name: 'Rename...', callback: async () => {
            if (!component.onRenameAsset)
                return;
            
            const oldName = asset.name;
            const newName = await Dialog.CreateWithTextInput('New asset name');

            asset.name = newName;
            component.onRenameAsset(asset, newName);

            UndoRedo.Push({
                fn: (type) => {
                    if (type === 'from')
                        component.onRenameAsset(asset, oldName);
                    else
                        component.onRenameAsset(asset, newName);

                    this.refresh();
                    this.showTab(component.id);
                }
            });

            this.refresh();
        } });
        component.onRemoveAsset && (items.remove = { name: 'Remove', callback: () => {
            if (component.onAddAsset) {
                UndoRedo.Push({
                    fn: (type) => {
                        if (type === 'from') {
                            component.onAddAsset(asset);
                            this.editor.core.onAddObject.notifyObservers(asset.data);
                        }
                        else {
                            component.onRemoveAsset(asset);
                            this.editor.core.onSelectAsset.notifyObservers(null);
                            this.editor.core.onRemoveObject.notifyObservers(asset.data);
                        }

                        this.refresh();
                        this.showTab(component.id);

                        // Refresh graph
                        this.editor.graph.configure();
                    }
                });
            }

            // Remove asset
            component.onRemoveAsset(asset);
            this.editor.core.onSelectAsset.notifyObservers(null);
            this.editor.core.onRemoveObject.notifyObservers(asset.data);

            this.refresh();

            // Refresh graph
            this.editor.graph.configure();
        } });

        return items;
    }
}

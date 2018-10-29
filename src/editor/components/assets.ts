import { Tools as BabylonTools } from 'babylonjs';

import Editor from '../editor';

import Tools from '../tools/tools';
import UndoRedo from '../tools/undo-redo';

import ContextMenu from '../gui/context-menu';
import Layout from '../gui/layout';
import Toolbar from '../gui/toolbar';

import { IAssetComponent, AssetElement } from '../../extensions/typings/asset';

import PrefabAssetComponent from '../prefabs/asset-component';
import { Dialog } from 'babylonjs-editor';

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
    public contextMenu: ContextMenu;

    public prefabs: PrefabAssetComponent;
    public assetPreviewDatas: AssetPreviewData[] = [];

    // Protected members
    protected currentComponent: IAssetComponent = null;
    protected emptyTextNode: HTMLHeadElement = null;

    // Static members
    private static _DefaultImageSource: string = null;

    /**
     * Constructor
     * @param editor the editore reference
     */
    constructor (protected editor: Editor) {
        // Context menu
        this.contextMenu = new ContextMenu('AssetContextMenu', {
            width: 200,
            height: 55,
            search: false
        });

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
        this.toolbar.onClick = id => this.toolbarClicked(id);
        this.toolbar.build('ASSETS-TOOLBAR');

        // Tabs
        this.tabs = $('#ASSETS-CONTENT').w2tabs({
            name: 'ASSETS-CONTENT'
        });

        // Create components
        this.prefabs = new PrefabAssetComponent(editor);

        // Add components tabs
        this.addDefaultComponents();

        // Finalize
        this.refresh();
    }

    /**
     * Clears the assets components
     */
    public clear (): void {
        this.components.forEach(c => {
            $('#' + c.id).remove();
            this.tabs.remove(c.id);
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
    }

    /**
     * Refreshes the tabs
     */
    public async refresh (id?: string): Promise<void> {
        // Check default image source
        if (!EditorAssets._DefaultImageSource) {
            const file = await Tools.CreateFileFromURL('assets/textures/waitlogo.png');
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
        this.components.forEach(async c => {
            if (id && c.id !== id)
                return;
            
            const assets = await c.onGetAssets();
            Tools.SortAlphabetically(assets, 'name');

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
                emptyTextNode.textContent = 'Empty';
    
                $('#' + c.id).append(emptyTextNode);
            }

            // Add elements
            const assetSize = (c.size || 50) + 'px';
            assets.forEach(a => {
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

                // Configure
                title.innerText = a.name;
                img.src = a.img || EditorAssets._DefaultImageSource;

                // Events
                img.addEventListener('click', ev => {
                    this.assetPreviewDatas.forEach(apd => {
                        if (apd.img) {
                            apd.img.style.backgroundColor = '';
                            apd.img.style.borderRadius = '';
                        }
                    });

                    img.style.backgroundColor = 'rgba(0, 0, 0, 0.25)';
                    img.style.borderRadius = '10px';

                    this.editor.core.onSelectAsset.notifyObservers(a.data);
                });
                img.addEventListener('contextmenu', ev => this.processContextMenu(ev, c, a));

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
    }

    /**
     * Returns the asset preview data from the given asset element
     * @param asset the source asset
     */
    public getAssetPreviewData (asset: AssetElement<any>): AssetPreviewData {
        return this.assetPreviewDatas.find(apd => apd.asset === asset);
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
        };
    }

    /**
     * On the user clicks on the toolbar
     * @param id the id of the clicked item
     */
    protected async toolbarClicked (id: string): Promise<void> {
        switch (id) {
            case 'add':
                if (this.currentComponent.onCreateAsset) {
                    const name = await Dialog.CreateWithTextInput('New asset name');
                    await this.currentComponent.onCreateAsset(name);
                    this.refresh(this.currentComponent.id);
                }

                break;
            default: break;
        }
    }

    /**
     * Processes the context menu for the clicked item
     * @param ev the mouse event object
     * @param component the component being modified
     * @param asset the target asset
     */
    protected processContextMenu (ev: MouseEvent, component: IAssetComponent, asset: AssetElement<any>): void {
        if (!component.onRemoveAsset)
            return;

        // Configure
        this.contextMenu.options.height = 55;
        this.contextMenu.tree.clear();

        const items = ((component.onContextMenu && component.onContextMenu()) || []);
        component.onRenameAsset && items.push({ id: 'rename', text: 'Rename...', img: 'icon-export' });
        items.push({ id: 'remove', text: 'Remove' });

        items.forEach(i => {
            this.contextMenu.tree.add({ id: i.id, text: i.text, img: i.img });
            this.contextMenu.options.height += 12.5;
        });

        // Events
        this.contextMenu.tree.onClick = async (id) => {
            // Custom callback?
            const customItem = items.find(i => i.callback && i.id === id);
            if (customItem) {
                customItem.callback(asset);
                return this.contextMenu.hide();
            }

            switch (id) {
                // Rename the asset
                case 'rename':
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
                    break;
                // Remove button, so manage undo/redo
                case 'remove':
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
                            }
                        });
                    }

                    // Remove asset
                    component.onRemoveAsset(asset);
                    this.editor.core.onSelectAsset.notifyObservers(null);
                    this.editor.core.onRemoveObject.notifyObservers(asset.data);
                    break;
            }

            // Refresh assets
            this.refresh();

            // Remove context menu
            this.contextMenu.hide();
        };

        // Show
        this.contextMenu.show(ev);
    }
}

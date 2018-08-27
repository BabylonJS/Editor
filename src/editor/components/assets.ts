import { Tools as BabylonTools } from 'babylonjs';

import Editor from '../editor';
import Tools from '../tools/tools';
import UndoRedo from '../tools/undo-redo';
import ContextMenu from '../gui/context-menu';

import { IAssetComponent, AssetElement } from '../../shared/asset';

import PrefabAssetComponent from '../prefabs/asset-component';

export interface AssetPreviewData {
    asset: AssetElement<any>;
    img: HTMLImageElement;
    parent: HTMLDivElement;
}

export default class EditorAssets {
    // Public members
    public tabs: W2UI.W2Tabs;
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
        // Tabs
        this.tabs = $('#ASSETS').w2tabs({
            name: 'ASSETS'
        });

        // Context menu
        this.contextMenu = new ContextMenu('AssetContextMenu', {
            width: 200,
            height: 55,
            search: false
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

            $('#ASSETS').append(this.emptyTextNode);

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
    
                $('#' + c.id).append(this.emptyTextNode);
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

                const text = Tools.CreateElement<HTMLElement>('small', a.name + 'text', {
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
                text.innerText = a.name;
                img.src = a.img || EditorAssets._DefaultImageSource;

                // Events
                img.addEventListener('click', ev => this.editor.core.onSelectAsset.notifyObservers(a.data));
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
                parent.appendChild(text);
                div.append(parent);

                // Register
                this.assetPreviewDatas.push({
                    asset: a,
                    img: img,
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
        $('#ASSETS').append('<div id="' + component.id + '" style="width: 100%; height: 100%; overflow: auto;"></div>');

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

        // Save component
        this.components.push(component);
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
     * Processes the context menu for the clicked item
     * @param ev the mouse event object
     * @param component the component being modified
     * @param asset the target asset
     */
    protected processContextMenu (ev: MouseEvent, component: IAssetComponent, asset: AssetElement<any>): void {
        if (!component.onRemoveAsset)
            return;

        // Configure
        this.contextMenu.tree.clear();
        this.contextMenu.tree.add({ id: 'remove', text: 'Remove' });

        // Events
        this.contextMenu.tree.onClick = () => {
            // Undo redo
            if (component.onAddAsset) {
                UndoRedo.Push({
                    fn: (type) => {
                        if (type === 'from') {
                            component.onAddAsset(asset);
                        }
                        else {
                            component.onRemoveAsset(asset);
                            this.editor.core.onSelectAsset.notifyObservers(null);
                        }

                        this.refresh();
                        this.showTab(component.id);
                    }
                });
            }

            // Remove asset
            component.onRemoveAsset(asset);
            this.editor.core.onSelectAsset.notifyObservers(null);

            this.refresh();

            // Remove context menu
            this.contextMenu.hide();
        };

        // Show
        this.contextMenu.show(ev);
    }
}

import {
    Scene, Color3, Color4,
    Vector2, Vector3, Vector4,
    BaseTexture, CubeTexture, Texture, FilesInputStore
} from 'babylonjs';
import * as dat from 'dat-gui';

import Editor from '../editor';
import TexturePicker from '../components/texture-picker';

import Tools from '../tools/tools';
import UndoRedo from '../tools/undo-redo';

import * as DatGuiExtensions from './gui-extensions/dat-gui';
import { TextBoxController, ImageBoxController } from './gui-extensions/dat-gui';

export default class Edition {
    // Public member
    public element: dat.GUI;

    /**
     * Constructor
     */
    constructor() {
        DatGuiExtensions.init();
    }

    /**
     * Adds a folder
     * @param name the folder name
     */
    public addFolder (name: string): dat.GUI {
        return this.element.addFolder(name);
    }

    /**
     * Add a gui controller
     * @param target the target object
     * @param propName the property of the object
     */
    public add (target: any, propName: string, other?: string[]): dat.GUIController {
        return this.element.add(target, propName, other);
    }

    /**
     * Adds a simple text controller to display a message.
     * @param content the content to draw in the controller
     */
    public addTextBox (content: string): TextBoxController {
        return this.element.addTextBox(content);
    }

    /**
     * Adds a simple image controller to display the image from the given Url.
     * @param url the url of the image to show.
     */
    public addImage (url: string): ImageBoxController {
        return this.element.addImage(url);
    }

    /**
     * Removes the dat element
     */
    public remove (): void {
        this.element.destroy();
        this.element.domElement.parentNode.removeChild(this.element.domElement);

        this.element = null;
    }

    /**
     * Updates the display of all elements
     * @param folder: the root folder
     */
    public updateDisplay (folder?: dat.GUI): void {
        if (!folder)
            folder = this.element;
        
        folder.__controllers.forEach(c => c.updateDisplay());

        for (const f in folder.__folders)
            this.updateDisplay(folder.__folders[f]);
    }

    /**
     * Call the given callback on each recursive onFinishChange
     * @param folder the root folder
     * @param callback the callback when a property changed
     */
    public onFinishChange (folder: dat.GUI, callback: (property: string, result: any, object?: any, initialValue?: any) => void): void {
        if (!folder)
            folder = this.element;

        folder.__controllers.forEach(c => {
            const existingFn = c['__onFinishChange'];
            c.onFinishChange((result) => {
                callback(c['property'], result, c['object'], c['initialValue']);
                if (existingFn)
                    existingFn(result, c['initialValue']);
            });
        });

        for (const f in folder.__folders)
            this.onFinishChange(folder.__folders[f], callback);
    }

    /**
     * Call the given callback on each recursive onChange
     * @param folder the root folder
     * @param callback the callback when a property changed
     */
    public onChange (folder: dat.GUI, callback: (property: string, result: any, object?: any, initialValue?: any) => void): void {
        if (!folder)
            folder = this.element;

        folder.__controllers.forEach(c => {
            const existingFn = c['__onChange'];
            c.onChange((result) => {
                callback(c['property'], result, c['object'], c['initialValue']);
                if (existingFn)
                    existingFn(result, c['initialValue']);
            });
        });

        for (const f in folder.__folders)
            this.onChange(folder.__folders[f], callback);
    }

    /**
     * Filters the existing folders using the given search string.
     * @param search the search string to filter folders.
     * @param root the folder to start filter. Default is the root gui element.
     */
    public filter (search: string, root: dat.GUI = this.element): void {
        for (const f in root.__folders) {
            const folder = root.__folders[f];
            let fullFolder = false;

            if (folder.name.toLowerCase().indexOf(search.toLowerCase()) === -1) {
                folder.domElement.style.display = 'none';
            } else {
                folder.domElement.style.display = '';
                
                // Found, re-show parents
                let parent = folder.parent;
                while (parent && parent.name) {
                    parent.domElement.style.display = '';
                    parent = parent.parent;
                }

                fullFolder = true;
            }

            // Controllers
            folder.__controllers.forEach(c => {
                // Get li element
                const li = c['__li'];
                if (!li)
                    return;

                // Full folder? show controllers of the current folder
                if (fullFolder) {
                    li.style.display = '';
                    return;
                }

                // Filter li element
                if (li.innerText.toLowerCase().indexOf(search.toLowerCase()) === -1) {
                    li.style.display = 'none';
                } else {
                    li.style.display = '';

                    // Found, re-show parents
                    let parent = c['__gui'];
                    while (parent && parent.name) {
                        parent.domElement.style.display = '';
                        parent = parent.parent;
                    }
                }
            });

            this.filter(search, folder);
        }
    }

    /**
     * Returns a controller identified by its property name
     * @param property the property used by the controller
     * @param parent the parent folder
     */
    public getController (property: string, parent = this.element): dat.GUIController {
        const controller = parent.__controllers.find(c => c['property'] === property);
        return controller;
    }

    /**
     * Build the edition tool
     * @param parentId the parent id (dom element)
     */
    public build (parentId: string): void {
        const parent = $('#' + parentId);

        this.element = new dat.GUI(<dat.GUIParams> {
            autoPlace: false,
            scrollable: true
        });

        parent[0].appendChild(this.element.domElement);

        this.element.useLocalStorage = true;
        this.element.width = parent.width();

        if (Tools.IsStandalone)
            Tools.ImportScript('./css/dat.gui.css');
    }

    /**
     * Add a gui controller hexadecimal color
     * @param target the target object
     * @param propName the property of the object
     */
    public addHexColor (target: any, propName: string): dat.GUIController {
        return this.element.addColor(target, propName);
    }

    /**
     * Adds a color element
     * @param parent the parent folder
     * @param name the name of the folder
     * @param color the color reference
     * @param callback called on the user changes the color
     */
    public addColor (parent: dat.GUI, name: string, color: Color3 | Color4, callback?: () => void): dat.GUI {
        const folder = parent.addFolder(name);
        const picker = {
            callback: () => {
                const input = document.createElement('input');
                input.type = 'color';
                input.value = color.toHexString();

                input.addEventListener('change', ev => {
                    const result = Color3.FromHexString(input.value);
                    color.r = result.r;
                    color.g = result.g;
                    color.b = result.b;
                    this.updateDisplay();

                    if (callback)
                        callback();
                }, false);
                input.select();
                input.click();
            }
        };

        folder.add(picker, 'callback').name('Color Picker');
        folder.add(color, 'r').min(0).max(1).step(0.01).onChange(() => callback && callback());
        folder.add(color, 'g').min(0).max(1).step(0.01).onChange(() => callback && callback());
        folder.add(color, 'b').min(0).max(1).step(0.01).onChange(() => callback && callback());

        if (color instanceof Color4) {
            // Sometimes, color.a is undefined
            color.a = color.a || 0;

            folder.add(color, 'a').min(0).max(1).step(0.01).onChange(() => callback && callback());
        }

        return folder;
    }

    /**
     * Adds a position element
     * @param parent the parent folder
     * @param name the name of the folder
     * @param vector the vector reference
     */
    public addVector(parent: dat.GUI, name: string, vector: Vector2 | Vector3 | Vector4, callback?: () => void): dat.GUI {
        const folder = parent.addFolder(name);
        folder.add(vector, 'x').step(0.01).onChange(() => callback && callback());
        folder.add(vector, 'y').step(0.01).onChange(() => callback && callback());

        if (vector instanceof Vector3 || vector instanceof Vector4)
        folder.add(vector, 'z').step(0.01).onChange(() => callback && callback());

        if (vector instanceof Vector4)
            folder.add(vector, 'w').step(0.01).onChange(() => callback && callback());

        return folder;
    }

    /**
     * Adds a texture controller
     * @param parent the parent folder
     * @param editor the editor reference
     * @param property the property of the object
     * @param object the object which has a texture
     * @param allowCubes if the cube textures should be displayed in the list
     * @param onlyCubes if only cube textures should be displayed in the list
     * @param callback: called when changed texture
     */
    public addTexture(parent: dat.GUI, editor: Editor, scene: Scene, property: string, object: any, allowCubes: boolean = false, onlyCubes: boolean = false, callback?: (texture: BaseTexture) => void): dat.GUIController {
        const getName = (name: string) => (name.length > 50) ? name.substr(0, 50) : name;
        const textures = { None: 'None' };
        let imageController: ImageBoxController = null;

        // Fill textures
        scene.textures.forEach(t => {
            const isCube = t instanceof CubeTexture;

            if (isCube && !allowCubes)
                return;

            if (!isCube && onlyCubes)
                return;

            textures[getName(t['url'] || t.name)] = t['url'] || t.name;
        });

        const getImageFile = (url: string): File => {
            let file = FilesInputStore.FilesToLoad[url.toLowerCase()];
            if (!file)
                file = FilesInputStore.FilesToLoad[url.replace('file:', '').toLowerCase()];
            if (!file)
                return null;

            return file;
        };

        const target = {
            texture: object[property] ? (object[property].url || object[property].name) : 'None',
            browse: (async () => {
                const from = object[property];
                const to = await TexturePicker.Show(scene, object[property], allowCubes, onlyCubes);

                object[property] = to;
                UndoRedo.Push({ baseObject: object, object: object, property: property, from: from, to: to });

                // Update
                if (to)
                    target.texture = (to['url'] || to.name);

                editor.inspector.updateDisplay();

                // Notify
                editor.inspector.notifyObjectChanged();
            })
        };

        const updateImagePreview = (url: string): void => {
            const file = getImageFile(url);
            if (!file)
                return;
            
            const fileUrl = URL.createObjectURL(file);
            imageController.setUrl(fileUrl);
            imageController.onLoaded = () => URL.revokeObjectURL(fileUrl);
            imageController.onError = () => URL.revokeObjectURL(fileUrl);
        };

        const folder = parent.addFolder(property);
        folder.open();

        const controller = folder.add(target, 'texture', textures);
        controller.onFinishChange(r => {
            const currentTexture = object[property];
            const texture = scene.textures.find(t => t['url'] === r || t.name === r);
            object[property] = texture;

            callback && callback(texture);

            // Update preview?
            if (imageController) 
                updateImagePreview(r);

            // Undo/redo
            UndoRedo.Pop();
            UndoRedo.Push({
                object: object,
                from: currentTexture,
                to: texture,
                property: property
            });

            // Notify
            editor.inspector.notifyObjectChanged();
        });
        folder.add(target, 'browse').name('Browse Texture...');

        // Preview
        if (allowCubes || onlyCubes)
            return controller;
        
        imageController = folder.addImage('');
        const existingTexture = <Texture> object[property];
        if (existingTexture) {
            const url = existingTexture.url;
            updateImagePreview(url);
        }

        return controller;
    }
}

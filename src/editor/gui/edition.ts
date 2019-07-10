import {
    Color3, Color4,
    Vector2, Vector3, Vector4,
    BaseTexture, CubeTexture,
    Scene
} from 'babylonjs';
import * as dat from 'dat-gui';

import Editor from '../editor';
import TexturePicker from '../components/texture-picker';

import Tools from '../tools/tools';
import UndoRedo from '../tools/undo-redo';

import * as DatGuiExtensions from './gui-extensions/dat-gui';

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
    public addTextBox (content: string): dat.GUIController {
        return this.element.addTextBox(content);
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
        const textures = ['None'];
        scene.textures.forEach(t => {
            const isCube = t instanceof CubeTexture;

            if (isCube && !allowCubes)
                return;

            if (!isCube && onlyCubes)
                return;

            textures.push(t['url'] || t.name);
        });

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

        const controller = parent.add(target, 'texture', textures);
        controller.onFinishChange(r => {
            const currentTexture = object[property];
            const texture = scene.textures.find(t => t['url'] === r || t.name === r);
            object[property] = texture;

            callback && callback(texture);

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

        parent.add(target, 'browse').name('Browse Texture...');

        return controller;
    }
}

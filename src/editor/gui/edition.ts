import {
    Color3, Color4,
    Vector2, Vector3, Vector4,
    Scene, BaseTexture, CubeTexture
} from 'babylonjs';
import * as dat from 'dat-gui';

import Editor from '../editor';
import Tools from '../tools/tools';
import UndoRedo from '../tools/undo-redo';

export default class Edition {
    // Public member
    public element: dat.GUI;

    /**
     * Constructor
     */
    constructor()
    { }

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
    public add (target: any, propName: string): dat.GUIController {
        return this.element.add(target, propName);
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
                    existingFn(result);
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
                    existingFn(result);
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

        Tools.ImportScript('./css/dat.gui.css');
    }

    /**
     * Adds a color element
     * @param parent the parent folder
     * @param name the name of the folder
     * @param color the color reference
     */
    public addColor (parent: dat.GUI, name: string, color: Color3 | Color4): dat.GUI {
        const target = {
            color: [color.r, color.g, color.b]
        };

        const folder = parent.addFolder(name);
        /*
        TODO: Fix CSS Issue with color element
        folder.addColor(target, 'color').name('Color').onChange((value: number[]) => {
            this.getController('r', folder).setValue(value[0] / 255);
            this.getController('g', folder).setValue(value[1] / 255);
            this.getController('b', folder).setValue(value[2] / 255);
        });
        */
        folder.add(color, 'r').step(0.01);
        folder.add(color, 'g').step(0.01);
        folder.add(color, 'b').step(0.01);

        if (color instanceof Color4) {
            // Sometimes, color.a is undefined
            color.a = color.a || 0;

            folder.add(color, 'a').step(0.01);
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

        if (vector instanceof Color4)
            folder.add(vector, 'w').step(0.01).onChange(() => callback && callback());

        return folder;
    }

    /**
     * Adds a texture controller
     * @param parent the parent folder
     * @param editor the editor reference
     * @param property the property of the object
     * @param object the object which has a texture
     * @param callback: called when changed texture
     */
    public addTexture(parent: dat.GUI, editor: Editor, property: string, object: any, allowCubes: boolean = false, onlyCubes: boolean = false, callback?: (texture: BaseTexture) => void): dat.GUIController {
        const scene = editor.core.scene;

        const textures = ['None'];
        scene.textures.forEach(t => {
            const isCube = t instanceof CubeTexture;

            if (isCube && !allowCubes)
                return;

            if (!isCube && onlyCubes)
                return;

            textures.push(t.name);
        });

        const target = {
            active: object[property] ? object[property].name : 'None',
            browse: () => editor.addEditPanelPlugin('texture-viewer', true, 'Texture Viewer', object, property, allowCubes)
        };

        const controller = parent.add(target, 'active', textures);
        controller.onFinishChange(r => {
            const currentTexture = object[property];
            const texture = scene.textures.find(t => t.name === r);
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
        });

        parent.add(target, 'browse').name('Browse Texture...');

        return controller;
    }
}

import {
    Color3, Color4,
    Vector3, Vector4
} from 'babylonjs';

import * as dat from 'dat-gui';

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
     * Call the given callback on each recursive onFinishChange
     * @param folder the root folder
     * @param callback the callback when a property changed
     */
    public onFinishChange (folder: dat.GUI, callback: (property: string, result: any) => void): void {
        if (!folder)
            folder = this.element;

        folder.__controllers.forEach(c => {
            const existingFn = c['__onFinishChange'];
            c.onFinishChange((result) => {
                if (existingFn)
                    existingFn(result);

                callback(c['property'], result);
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
    public onChange (folder: dat.GUI, callback: (property: string, result: any) => void): void {
        if (!folder)
            folder = this.element;

        folder.__controllers.forEach(c => {
            const existingFn = c['__onChange'];
            c.onChange((result) => {
                if (existingFn)
                    existingFn(result);
                callback(c['property'], result);
            });
        });

        for (const f in folder.__folders)
            this.onChange(folder.__folders[f], callback);
    }

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

        this.element = new dat.GUI({
            autoPlace: false
        });
        this.element.width = parent.width();

        parent[0].appendChild(this.element.domElement);

        System.import('../../../css/dat.gui.css');
    }

    /**
     * Adds a color element
     * @param parent the parent folder
     * @param name the name of the folder
     * @param color the color reference
     */
    public addColor (parent: dat.GUI, name: string, color: Color3 | Color4): dat.GUI {
        const target = {
            color: color.asArray()
        };

        const folder = parent.addFolder(name);
        folder.addColor(target, 'color').name('Color').onChange((value: number[]) => {
            this.getController('r', folder).setValue(value[0] / 255);
            this.getController('g', folder).setValue(value[1] / 255);
            this.getController('b', folder).setValue(value[2] / 255);

            if (color instanceof Color4)
            this.getController('a', folder).setValue(value[3] / 255);
        });
        folder.add(color, 'r').step(0.01);
        folder.add(color, 'g').step(0.01);
        folder.add(color, 'b').step(0.01);

        if (color instanceof Color4)
            folder.add(color, 'a').step(0.01);

        return folder;
    }

    /**
     * Adds a position element
     * @param parent the parent folder
     * @param name the name of the folder
     * @param vector the vector reference
     */
    public addVector(parent: dat.GUI, name: string, vector: Vector3 | Vector4): dat.GUI {
        const folder = parent.addFolder(name);
        folder.add(vector, 'x').step(0.01);
        folder.add(vector, 'y').step(0.01);
        folder.add(vector, 'z').step(0.01);

        if (vector instanceof Color4)
            folder.add(vector, 'w').step(0.01);

        return folder;
    }
}

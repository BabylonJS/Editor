import { Scene, {{ctor}} } from 'babylonjs';

class Custom{{ctor}} extends {{ctor}} {
    /**
     * Constructor
     * @param name the name of the material being created
     * @param scene the scene where to add the material
     */
    constructor (name: string, scene: Scene) {
        super(name, scene);
    }
}

exportScript(Custom{{ctor}});

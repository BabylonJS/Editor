import { Scene } from 'babylonjs';
import { Spector } from 'spectorjs';

import Extension from '../extension';
import Extensions from '../extensions';

export default class SpectorDebugExtension extends Extension<{ }> {
    // Public members
    public spector: Spector;

    /**
     * Constructor
     * @param scene: the babylonjs scene
     */
    constructor (scene: Scene) {
        super(scene);

        // Extension
        this.alwaysApply = true;

        // Spector
        this.spector = new Spector();
    }

    /**
     * On apply the extension
     */
    public onApply (): void {
        if (parent !== opener)
            this.spector.displayUI();
    }

    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    public onLoad (): void
    { }
}

Extensions.Register('SpectorDebug', SpectorDebugExtension);

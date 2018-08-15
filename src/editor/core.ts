import { Engine, Scene, Observable } from 'babylonjs';
import { AdvancedDynamicTexture } from 'babylonjs-gui';

export interface IUpdatable {
    /**
     * On before render the scene
     */
    onPreUpdate?(): void;
    /**
     * On after render the scene
     */
    onPostUpdate?(): void;
}

export default class Core {
    // Public members
    public engine: Engine;

    public scenes: Scene[] = [];
    public scene: Scene;

    public uiTextures: AdvancedDynamicTexture[] = [];

    public currentSelectedObject: any = null;
    public disableObjectSelection: boolean = false;

    public updates: IUpdatable[] = [];

    public onSelectObject: Observable<any> = new Observable<any>();
    public onSelectAsset: Observable<any> = new Observable<any>();
    public onResize: Observable<{ }> = new Observable<{ }>();
    public onAddObject: Observable<{ }> = new Observable<{ }>();
    public onGlobalPropertyChange = new Observable<{ baseObject?: any; object: any; property: string; value: any; initialValue: any; }>();

    public renderScenes: boolean = true;
    
    /**
     * Constructor
     */
    constructor() {
        // Register on events
        this.onSelectObject.add((object) => this.currentSelectedObject = object);
    }

    /**
     * Removes the given scene from the registered scenes
     * @param scene: the scene reference to remove
     */
    public removeScene (scene: Scene, dispose?: boolean): boolean {
        const index = this.scenes.findIndex(s => s === scene);
        if (index !== -1) {
            dispose && scene.dispose();
            this.scenes.splice(index, 1);
            return true;
        }
        
        return false;
    }

    /**
     * Removes the given UI (advanced texture) from the registered UIS
     * @param ui: the ui advanced texture reference to remove
     */
    public removeUI (ui: AdvancedDynamicTexture, dispose?: boolean): boolean {
        const index = this.uiTextures.findIndex(u => u === ui);
        if (index !== -1) {
            dispose && ui.dispose();
            this.uiTextures.splice(index, 1);
            return true;
        }
        
        return false;
    }

    /**
     * Updates the rendering + notify updaters
     */
    public update(): void {
        if (!this.renderScenes)
            return;
        
        // On pre update
        this.updates.forEach(u => u.onPreUpdate && u.onPreUpdate());

        // Update (render) scenes
        this.scenes.forEach(s => s.render());

        // On post update
        this.updates.forEach(u => u.onPostUpdate && u.onPostUpdate());
    }
}

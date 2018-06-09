import Editor from '../editor';
import Layout from '../gui/layout';

export default class Stats {
    // Public members
    public editor: Editor;
    public layout: Layout;

    public renderingDiv: JQuery<HTMLDivElement>;
    public averageFPS: JQuery<HTMLElement>;
    public instantaneousFPS: JQuery<HTMLElement>;
    public averageFrameTime: JQuery<HTMLElement>;

    public sceneDiv: JQuery<HTMLDivElement>;
    public texturesCount: JQuery<HTMLElement>;
    public materialsCount: JQuery<HTMLElement>;
    public compiledEffects: JQuery<HTMLElement>;

    public frameInterval: number = 10;

    // Private members
    private _frameCount: number = 0;

    /**
     * Constructor
     * @param editor the editor reference
     */
    constructor (editor: Editor) {
        this.editor = editor;

        // Layout
        this.layout = new Layout('STATS');
        this.layout.panels = [
            { type: 'left', size: '50%', content: '<div id="STATS-RENDERING" style="width: 100%; height: 100%"></div>' },
            { type: 'main', size: '50%', content: '<div id="SCENE-RENDERING" style="width: 100%; height: 100%"></div>' }
        ];
        this.layout.build('STATS');

        // Rendering divs
        this.renderingDiv = <JQuery<HTMLDivElement>> $('#STATS-RENDERING');
        this.averageFPS = $('<h4 style="text-align: center;"></h4>');
        this.instantaneousFPS = $('<h4 style="text-align: center;"></h4>');
        this.averageFrameTime = $('<h4 style="text-align: center;"></h4>');

        this.renderingDiv.append('<h1>Rendering</h1>');
        this.renderingDiv.append(this.averageFPS);
        this.renderingDiv.append(this.instantaneousFPS);
        this.renderingDiv.append(this.averageFrameTime);

        // Scene divs
        this.sceneDiv = <JQuery<HTMLDivElement>> $('#SCENE-RENDERING');
        this.texturesCount = $('<h4 style="text-align: center;"></h4>');
        this.materialsCount = $('<h4 style="text-align: center;"></h4>');
        this.compiledEffects = $('<h4 style="text-align: center;"></h4>');

        this.sceneDiv.append('<h1>Scene</h1>');
        this.sceneDiv.append(this.texturesCount);
        this.sceneDiv.append(this.materialsCount);
        this.sceneDiv.append(this.compiledEffects);
    }

    /**
     * Update the stats
     */
    public updateStats (): void {
        const engine = this.editor.core.engine;
        const scene = this.editor.core.scene;

        scene.registerAfterRender(() => {
            this._frameCount++;
            if (this._frameCount < this.frameInterval)
                return;
            
            this.averageFPS.text('Average FPS: ' + engine.performanceMonitor.averageFPS.toFixed(0));
            this.instantaneousFPS.text('Instantanous FPS: ' + engine.performanceMonitor.instantaneousFPS.toFixed(0));
            this.averageFrameTime.text('Average Frame Time: ' + engine.performanceMonitor.averageFrameTime.toFixed(0));

            this.texturesCount.text('Textures Count: ' + scene.textures.length);
            this.materialsCount.text('Materials Count: ' + scene.materials.length);
            this.compiledEffects.text('Compiled Effects: ' + Object.keys(engine['_compiledEffects']).length);

            this._frameCount = 0;
        });

        engine.performanceMonitor;
    }
}
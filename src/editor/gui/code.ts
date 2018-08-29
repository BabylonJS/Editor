import { IDisposable } from '../typings/typings';

import Tools from '../tools/tools';
import ThemeSwitcher from '../tools/theme';

// TODO: remove this line and find a way to
// import * as monaco from 'monaco-editor';
export interface MonacoDisposable extends IDisposable {
    [index: string]: any;
}
declare var monaco: MonacoDisposable;

// TODO: remove this line and find a way to
// import * as ts from 'typescript';
export interface TypescriptDisposable extends IDisposable {
    [index: string]: any;
}
declare var ts: TypescriptDisposable;

export default class CodeEditor {
    // Public members
    public editor: MonacoDisposable = null;
    public onChange: (value: string) => void;

    // Private members
    private _language: string;
    private _defaultValue: string;

    // Static members
    public static ExternalLibraries: string = null;
    public static ExtraLibs: { lib: MonacoDisposable, caller: Window; }[] = [];
    public static Instances: MonacoDisposable[] = [];

    /**
     * Remove extra lib from the registered callers
     * @param caller the caller reference (Window)
     */
    public static RemoveExtraLib (caller: Window): void {
        const lib = this.ExtraLibs.find(el => el.caller === caller);
        const index = this.ExtraLibs.indexOf(lib);

        if (index !== -1)
            this.ExtraLibs.splice(index, 1);
    }

    /**
     * Returns if at least one code editor is focused
     */
    public static HasOneFocused (): boolean {
        for (const i of this.Instances) {
            if (i.isFocused())
                return true;
        }

        return false;
    }
    
    /**
     * Constructor
     */
    constructor (language: string = 'javascript', value: string = '// Some Code') {
        this._language = language;
        this._defaultValue = value;
    }

    /**
     * Returns the editor's value
     */
    public getValue (): string {
        return this.editor.getValue();
    }

    /**
     * Sets the value of the editor
     * @param value the value to set
     */
    public setValue (value: string): void {
        this.editor.setValue(value);
    }

    /**
     * Focus the editor
     */
    public focus (): void {
        this.editor.focus();
    }

    /**
     * Builds the code editor
     * @param parentId the parent id of the editor
     */
    public async build (parentId: string | HTMLElement, caller: Window = window): Promise<void> {
        if (typeof parentId === 'string')
            parentId = '#' + parentId;
        
        if (!CodeEditor.ExternalLibraries) {
            const libs = [
                'assets/typings/babylon.d.ts',
                'assets/typings/babylon.gui.module.d.ts',
                'assets/typings/babylonjs.materials.module.d.ts',
                'assets/typings/babylonjs.proceduralTextures.module.d.ts',
                'assets/templates/material-creator/custom-material.d.ts',
                'assets/templates/post-process-creator/custom-post-process.d.ts',
                'assets/templates/code/path-finder.d.ts',
                'assets/templates/code/tools.d.ts',
                'assets/templates/code/mobile.d.ts'
            ];

            const promises = libs.map(l => Tools.LoadFile(l, false));
            const results = await Promise.all(promises);

            let content = '';
            results.forEach(r => content += r + '\n');

            content += `
                declare var scene: BABYLON.Scene;
                declare var mesh: BABYLON.Mesh;
                declare var pointlight: BABYLON.PointLight;
                declare var camera: BABYLON.Camera;
                declare var universalcamera: BABYLON.UniversalCamera;
                declare var spotlight: BABYLON.SpotLight;
                declare var dirlight: BABYLON.DirectionalLight;
                declare var hemlight: BABYLON.HemisphericLight;
                declare var groundmesh: BABYLON.GroundMesh;
                declare var particleSystem: BABYLON.ParticleSystem;
                declare var gpuParticleSystem: BABYLON.GPUParticleSystem;

                declare var tools: BehaviorCodeTools;
                declare var mobile: Mobile;
            `;

            CodeEditor.ExternalLibraries = content;
        }

        // Import typescript
        await Tools.ImportScript('typescript');
        
        // Create editor
        this.editor = caller['monaco'].editor.create($(<any>parentId)[0], {
            value: this._defaultValue,
            language: this._language,
            automaticLayout: true,
            selectionHighlight: true,
            theme: caller !== window || ThemeSwitcher.ThemeName === 'Dark' ? 'vs-dark' : undefined
        });

        if (!CodeEditor.ExtraLibs.find(el => el.caller === caller)) {
            caller['monaco'].languages.typescript.typescriptDefaults.setCompilerOptions({ experimentalDecorators: true, target: 5, allowNonTsExtensions: true });
            
            CodeEditor.ExtraLibs.push({
                lib: caller['monaco'].languages.typescript.typescriptDefaults.addExtraLib(CodeEditor.ExternalLibraries, 'CodeEditor'),
                caller: caller
            });
        }

        this.editor.onDidChangeModelContent(() => {
            if (this.onChange)
                this.onChange(this.editor.getValue());
        });

        // Register
        CodeEditor.Instances.push(this.editor);
    }

    /**
     * Transpiles the given TS source to JS source
     * @param source the source to transpile
     */
    public transpileTypeScript (source: string, moduleName: string): string {
        return ts.transpile(source, {
            module: 'none',
            target: 'es5',
            experimentalDecorators: true,
            // sourceMap: true,
            // inlineSourceMap: true
        }, moduleName + '.ts', undefined, moduleName + '.ts');
    }

    /**
     * Creates a windowed editor
     * @param options: the editor's configuration
     */
    public static async CreateWindowedEditor (options: {
        name: string;
        data: any;
        baseData: any;
        property: string;
        baseEditor: CodeEditor
    }): Promise<void>
    {
        // Create popup
        const popup = Tools.OpenPopup('./code-editor.html#' + name, name, 1280, 800);
        popup.document.title = name;

        // Editor page loaded, create editor
        popup.addEventListener('editorloaded', async () => {
            const code = new CodeEditor('javascript');
            await code.build(popup.document.getElementById('EDITOR-DIV'), popup);

            code.onChange = value => {
                if (options.data) {
                    options.data[options.property] = code.getValue();

                    if (options.data === options.baseData)
                        options.baseEditor.setValue(options.data[options.property]);
                }
                else if (options.baseData) {
                    options.baseData[options.property] = options.baseEditor.getValue();
                }
            };
            code.setValue(options.baseData[options.property]);
        });

        // On close the window, remove extra libs (typings)
        popup.addEventListener('beforeunload', () => {
            CodeEditor.RemoveExtraLib(popup);
        });
    }
}

import { IDisposable, IStringDictionary } from '../typings/typings';

import Tools from '../tools/tools';
import ThemeSwitcher from '../tools/theme';

import * as typescript from 'typescript';
import { editor } from 'monaco-editor';

export interface Typings {
    name: string;
    id: string;
    content: string;
}

export interface TranspilationOutput {
    compiledCode: string;
    errors: {
        line: number;
        column: number;
        message: string;
    }[];
}

export default class CodeEditor {
    // Public members
    public editor: editor.ICodeEditor = null;
    public onChange: (value: string) => void;

    public theme: string = null;

    // Private members
    private _language: string;
    private _defaultValue: string;

    private _caller: Window = null;

    // Static members
    public static Typescript: typeof typescript;
    public static ExternalLibraries: string = null;
    public static ExtraLibs: { lib: IDisposable, caller: Window; }[] = [];
    public static CustomLibs: IStringDictionary<IDisposable> = { };
    public static Instances: editor.ICodeEditor[] = [];

    public static Libs: string[] = [
        'assets/typings/babylon.module.d.ts',
        'assets/typings/babylon.gui.module.d.ts',
        'assets/typings/babylonjs.materials.module.d.ts',
        'assets/typings/babylonjs.proceduralTextures.module.d.ts',
        'assets/typings/babylonjs.postProcess.module.d.ts',
        'assets/templates/material-creator/custom-material.d.ts',
        'assets/templates/post-process-creator/custom-post-process.d.ts',
        'assets/templates/code/path-finder.d.ts',
        'assets/templates/code/tools.d.ts',
        'assets/templates/code/mobile.d.ts'
    ];

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
            if (i.hasTextFocus())
                return true;
        }

        return false;
    }
    
    /**
     * Constructor.
     * @param language the language of the code editor.
     * @param value the default value to draw in the code editor.
     * @param theme the theme to use for the code editor.
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
     * Disposes the editor
     */
    public dispose (): void {
        this.editor.dispose();

        const index = CodeEditor.Instances.indexOf(this.editor);
        if (index !== -1)
            CodeEditor.Instances.splice(index, 1);
    }

    /**
     * Builds the code editor
     * @param parentId the parent id of the editor
     */
    public async build (parentId: string | HTMLElement, caller: Window = window): Promise<void> {
        this._caller = caller;

        if (typeof parentId === 'string')
            parentId = '#' + parentId;
        
        if (!CodeEditor.ExternalLibraries) {
            const promises = CodeEditor.Libs.map(l => Tools.LoadFile(l, false));
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
        
        // Create editor
        this.editor = caller['monaco'].editor.create($(<any>parentId)[0], {
            value: this._defaultValue,
            language: this._language,
            automaticLayout: true,
            selectionHighlight: true,
            theme: this.theme ? this.theme : (caller !== window || ThemeSwitcher.ThemeName === 'Dark' ? 'vs-dark' : undefined)
        });

        if (!CodeEditor.ExtraLibs.find(el => el.caller === caller)) {
            caller['monaco'].languages.typescript.typescriptDefaults.setCompilerOptions({
                module: caller['monaco'].languages.typescript.ModuleKind.CommonJS,
                target: caller['monaco'].languages.typescript.ScriptTarget.ES5,
                noResolve: true,
                suppressOutputPathCheck: true,
                allowNonTsExtensions: true,
                experimentalDecorators: true
            });
            
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
     * Transpiles the current TS source to JS source.
     */
    public async transpileTypeScript (): Promise<TranspilationOutput> {
        const model = this.editor.getModel();
        const uri = model.uri;

        const worker = await this._caller['monaco'].languages.typescript.getTypeScriptWorker();
        const languageService = await worker(uri);

        const uriStr = uri.toString();
        const result = await languageService.getEmitOutput(uriStr);

        const diagnostics = await Promise.all([languageService.getSyntacticDiagnostics(uriStr), languageService.getSemanticDiagnostics(uriStr)]);

        return {
            compiledCode: result.outputFiles[0].text,
            errors: diagnostics.filter(d => d.length).map(d => {
                const p = model.getPositionAt(d[0].start);
                return { line: p.lineNumber, column: p.column, message: d[0].messageText };
            })
        };
    }

    /**
     * Transpiles the given TS source to JS source
     * @param source the source to transpile
     */
    public static async TranspileTypeScript (source: string, moduleName: string, config?: any): Promise<string> {
        this.Typescript = await Tools.ImportScript<any>('typescript');

        return this.Typescript.transpile(source, config || {
            module: 'none',
            target: 'es5',
            experimentalDecorators: true,
            // sourceMap: true,
            // inlineSourceMap: true
        }, moduleName + '.ts', undefined, moduleName + '.ts');
    }

    /**
     * Gets all the typings and returns its result
     */
    public static async GetTypings (): Promise<Typings[]> {
        const result = [];

        for (const l of this.Libs)
            result.push({ name: `typings/${Tools.GetFilename(l)}`, id: l, content: await Tools.LoadFile(l, false) });

        return result;
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

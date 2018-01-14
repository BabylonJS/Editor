import { IDisposable } from '../typings/typings';
import Tools from '../tools/tools';

// TODO: remove this line and find a way to
// import * as monaco from 'monaco-editor';
export interface MonacoDisposable extends IDisposable {
    [index: string]: any;
}
declare var monaco: MonacoDisposable;

export default class CodeEditor {
    // Public members
    public editor: MonacoDisposable = null;
    public onChange: (value: string) => void;

    // Private members
    private _language: string;
    private _defaultValue: string;

    // Static members
    public static ExternalLibraries: string = null;
    public static ExtraLib: MonacoDisposable;
    
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
     * Builds the code editor
     * @param parentId the parent id of the editor
     */
    public async build (parentId: string): Promise<void> {
        if (!CodeEditor.ExternalLibraries) {
            const libs = [
                'node_modules/babylonjs/babylon.d.ts',
                'assets/templates/material-creator/custom-material.d.ts',
                'assets/templates/post-process-creator/custom-post-process.d.ts'
            ];
            let content = '';

            for (const l of libs)
                content += await Tools.LoadFile(l, false) + '\n';

            content += `
                declare var scene: BABYLON.Scene;
                declare var mesh: BABYLON.Mesh;
                declare var pointlight: BABYLON.PointLight;
                declare var universalcamera: BABYLON.UniversalCamera;
                declare var spotlight: BABYLON.SpotLight;
                declare var dirlight: BABYLON.DirectionalLight;
                declare var hemlight: BABYLON.HemisphericLight;
                declare var groundmesh: BABYLON.GroundMesh;
                declare var particleSystem: BABYLON.ParticleSystem;
                declare var gpuParticleSystem: BABYLON.GPUParticleSystem;

                declare var CustomMaterial: CustomMaterialInterface;
                declare var CustomPostProcess: CustomPostProcessInterface;
            `;

            CodeEditor.ExternalLibraries = content;
        }

        this.editor = monaco.editor.create($('#' + parentId)[0], {
            value: this._defaultValue,
            language: this._language,
            automaticLayout: true,
            selectionHighlight: true
        });

        if (!CodeEditor.ExtraLib)
            CodeEditor.ExtraLib = monaco.languages.typescript.javascriptDefaults.addExtraLib(CodeEditor.ExternalLibraries, 'BehaviorEditor');

        this.editor.onDidChangeModelContent(() => {
            if (this.onChange)
                this.onChange(this.editor.getValue());
        });
    }
}

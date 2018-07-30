import { WaterMaterial } from 'babylonjs-materials';

import MaterialTool from './material-tool';
import Tools from '../../tools/tools';

import Picker from '../../gui/picker';

export default class WaterMaterialTool extends MaterialTool<WaterMaterial> {
    // Public members
    public divId: string = 'WATER-MATERIAL-TOOL';
    public tabName: string = 'Water Material';

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && this.object instanceof WaterMaterial;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(object: any): void {
        super.update(object);

        // Diffuse & Specular
        this.tool.addColor(this.tool.element, 'Diffuse', this.object.diffuseColor).open();

        const specular = this.tool.addFolder('Specular');
        specular.open();
        this.tool.addColor(specular, 'Specular', this.object.specularColor).open();
        specular.add(this.object, 'specularPower').step(0.1).name('Specular Power');

        // Render List
        const renderList = this.tool.addFolder('Reflection & Refraction');
        renderList.open();
        renderList.add(this, '_setRenderList').name('Set Render List...');

        // Bump
        const bump = this.tool.addFolder('Bump');
        bump.open();
        this.tool.addTexture(bump, this.editor, 'bumpTexture', this.object, false);
        bump.add(this.object, 'bumpHeight').min(0).max(10).step(0.001).name('Bump Height');

        // Wind
        const wind = this.tool.addFolder('Wind');
        wind.open();
        wind.add(this.object, 'windForce').min(0.0).step(0.01).name('Wind Force');
        this.tool.addVector(wind, 'Wind Direction', this.object.windDirection).open();;

        // Waves
        const waves = this.tool.addFolder('Waves');
        waves.open();
        waves.add(this.object, 'waveHeight').min(0.0).step(0.01).name('Wave Height');
        waves.add(this.object, 'waveLength').min(0.0).step(0.01).name('Wave Length');
        waves.add(this.object, 'waveSpeed').min(0.0).step(0.01).name('Wave Speed');

        // Colors
        const colors = this.tool.addFolder('Colors');
        colors.open();
        this.tool.addColor(colors, 'Water Color 1', this.object.waterColor).open();
        colors.add(this.object, 'colorBlendFactor').min(0.0).max(1.0).step(0.01).name('Blend Factor 1');

        this.tool.addColor(colors, 'Water Color 2', this.object.waterColor2).open();
        colors.add(this.object, 'colorBlendFactor2').min(0.0).max(1.0).step(0.01).name('Blend Factor 2');

        // Advanced
        const advanced = this.tool.addFolder('Advanced');
        advanced.open();
        advanced.add(this.object, 'bumpSuperimpose').name('Bump Super Impose');
        advanced.add(this.object, 'bumpAffectsReflection').name('Bump Affects Reflection');
        advanced.add(this.object, 'fresnelSeparate').name('Fresnel Separate');

        // Options
        super.addOptions();
    }

    // Sets the render list
    private _setRenderList (): void {
        const picker = new Picker('Reflection & Refraction');
        picker.addSelected(this.object.getRenderList().map(m => {
            return { id: m.id };
        }));
        picker.addItems(this.editor.core.scene.meshes);
        picker.open(items => {
            this.object['_reflectionRTT'].renderList = [];
            this.object['_refractionRTT'].renderList = [];

            items.forEach(i => {
                const mesh = this.editor.core.scene.getMeshByID(i.name);
                if (mesh)
                    this.object.addToRenderList(mesh);
            });
        });
    }
}

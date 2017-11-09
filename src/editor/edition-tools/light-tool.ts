import { Light, DirectionalLight, PointLight, SpotLight, ShadowGenerator } from 'babylonjs';

import AbstractEditionTool from './edition-tool';
import Tools from '../tools/tools';

export default class LightTool extends AbstractEditionTool<Light> {
    // Public members
    public divId: string = 'LIGHT-TOOL';
    public tabName: string = 'Light';

    // Private members
    private _generatesShadows: boolean = false;
    private _shadowMapSize: string = '512';
    private _darkness: number = 0;

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return object instanceof Light;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(light: Light): void {
        super.update(light);
        super.setTabName(Tools.GetConstructorName(light).replace('Light', ''));

        // Common
        const common = this.tool.addFolder('Common');
        common.open();

        common.add(light, 'intensity').min(0).step(0.01).name('Intensity');
        common.add(light, 'range').min(0).step(0.01).name('Range');
        common.add(light, 'radius').min(0).step(0.01).name('Radius');

        // Colors
        const colors = this.tool.addFolder('Colors');
        colors.open();

        this.tool.addColor(colors, 'Diffuse', light.diffuse).open();
        this.tool.addColor(colors, 'Specular', light.specular).open();

        // Spot
        if (light instanceof SpotLight) {
            const spot = this.tool.addFolder('Spot Light');
            spot.open();
            spot.add(light, 'angle').step(0.01).name('Angle');
            spot.add(light, 'exponent').step(0.01).name('Exponent');
        }

        // Shadows
        if (light instanceof DirectionalLight || light instanceof PointLight || light instanceof SpotLight) {
            const shadowGenerator = <ShadowGenerator> light.getShadowGenerator();
            shadowGenerator ? this._generatesShadows = true : this._generatesShadows = false;

            const shadows = this.tool.addFolder('Shadows');
            shadows.open();

            shadows.add(this, '_generatesShadows').name('Generate Shadows').onFinishChange(r => {
                if (!r)
                    light.getShadowGenerator().dispose();
                else {
                    const size = parseInt(this._shadowMapSize);
                    new ShadowGenerator(size, light);
                }

                this.editor.edition.setObject(light);
            });
            
            shadows.add(light, 'shadowEnabled').name('Enable Shadows');

            const sizes: string[] = [];
            const max = this.editor.core.engine.getCaps().maxTextureSize;

            let current = 8;
            while (current < max) {
                current <<= 1;
                sizes.push(current.toString());
            }

            shadows.add(this, '_shadowMapSize', sizes).name('Shadow Map Size').onFinishChange(r => shadowGenerator && shadowGenerator.getShadowMap().resize(parseInt(r)));

            if (shadowGenerator) {
                this._darkness = shadowGenerator.getDarkness();

                shadows.add(this, '_darkness').min(0).max(1).step(0.01).name('Darkness').onChange(r => shadowGenerator.setDarkness(r));
                shadows.add(shadowGenerator, 'bias').min(0).max(1).step(0.0000001).name('Bias');
                shadows.add(shadowGenerator, 'blurBoxOffset').min(0).max(10).step(1).name('Blur Box Offset');
                shadows.add(shadowGenerator, 'blurScale').min(0).max(16).step(1).name('Blur Scale');
                shadows.add(shadowGenerator, 'useKernelBlur').name('Use Kernel Blur');
                shadows.add(shadowGenerator, 'blurKernel').min(0).max(512).step(1).name('Blur Kernel');

                shadows.add(shadowGenerator, 'usePoissonSampling').name('Use Poisson Sampling');
                shadows.add(shadowGenerator, 'useExponentialShadowMap').name('Use Exponential Shadow Map');
                shadows.add(shadowGenerator, 'useBlurExponentialShadowMap').name('Use Blur Exponential Shadow Map');
                shadows.add(shadowGenerator, 'useCloseExponentialShadowMap').name('Use Close Exponential Shadow Map');
                shadows.add(shadowGenerator, 'useBlurCloseExponentialShadowMap').name('Use Blur Close Exponential Shadow Map');
            }
        }
    }
}

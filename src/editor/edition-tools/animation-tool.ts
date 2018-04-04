import * as BABYLON from 'babylonjs';
import { Animation, EasingFunction } from 'babylonjs';

import AbstractEditionTool from './edition-tool';
import Tools from '../tools/tools';

export default class AnimationTool extends AbstractEditionTool<Animation> {
    // Public members
    public divId: string = 'ANIMATION-TOOL';
    public tabName: string = 'Animation';

    // Private members
    private _easingFunction: string = '';
    private _easingMode: string = '';

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return object instanceof Animation;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(animation: Animation): void {
        super.update(animation);

        // Animation
        const common = this.tool.addFolder('Common');
        common.open();

        common.add(animation, 'name').name('Name');
        common.add(animation, 'framePerSecond').step(0.1).name('Frame Per Second');
        
        // Blending
        const blending = this.tool.addFolder('Blending');
        blending.open();

        if (animation.enableBlending !== undefined) {
            blending.add(animation, 'enableBlending').name('Enable Blending');
            blending.add(animation, 'blendingSpeed').name('Blending Speed');
        }

        // Easing
        const easing = this.tool.addFolder('Easing');
        easing.open();

        const easingFunction = <EasingFunction> animation.getEasingFunction();
        const easingFunctions: string[] = [
            'None',
            'CircleEase',
            'BackEase',
            'BounceEase',
            'CubicEase',
            'ElasticEase',
            'ExponentialEase',
            'PowerEase',
            'QuadraticEase',
            'QuarticEase',
            'QuinticEase',
            'SineEase',
            'BezierCurveEase'
        ];
        
        this._easingFunction = easingFunction ? Tools.GetConstructorName(easingFunction) : 'None';
        easing.add(this, '_easingFunction', easingFunctions).name('Easing Function').onFinishChange(r => {
            const easingFunction = new BABYLON[r]();
            animation.setEasingFunction(easingFunction);

            this.update(animation);
        });

        if (easingFunction) {
            // Easing mode
            const easingModes: string[] = [
                'EASINGMODE_EASEIN',
                'EASINGMODE_EASEOUT',
                'EASINGMODE_EASEINOUT'
            ];

            this._easingMode = easingModes[easingFunction.getEasingMode()];
            easing.add(this, '_easingMode', easingModes).name('Easing Mode').onFinishChange(r => {
                easingFunction.setEasingMode(EasingFunction[r]);
            });

            // Set parameters
            switch (this._easingFunction) {
                case 'BackEase':
                    easing.add(easingFunction, 'amplitude').name('Amplitude');
                    break;
                case 'BounceEase':
                    easing.add(easingFunction, 'bounces').name('Bounces');
                    easing.add(easingFunction, 'bounciness').name('Bounciness');
                    break;
                case 'ElasticEase':
                    easing.add(easingFunction, 'oscillations').name('Oscillations');
                    easing.add(easingFunction, 'springiness').name('Springiness');
                    break;
                case 'ExponentialEase':
                    easing.add(easingFunction, 'exponent').name('Exponent');
                    break;
                case 'PowerEase':
                    easing.add(easingFunction, 'power').name('Power');
                    break;
                case 'BezierCurveEase':
                    easing.add(easingFunction, 'x1').name('x1');
                    easing.add(easingFunction, 'y1').name('y1');
                    easing.add(easingFunction, 'x2').name('x2');
                    easing.add(easingFunction, 'y2').name('y2');
                    break;
                default: break; // Should never happen
            }
        }
    }
}

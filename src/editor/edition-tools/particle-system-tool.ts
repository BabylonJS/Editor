import { ParticleSystem, GPUParticleSystem, Vector3, IParticleSystem, BoxParticleEmitter, SphereParticleEmitter, ConeParticleEmitter } from 'babylonjs';
import AbstractEditionTool from './edition-tool';

export default class ParticleSystemTool extends AbstractEditionTool<ParticleSystem | GPUParticleSystem> {
    // Public members
    public divId: string = 'PARTICLE-SYSTEM-TOOL';
    public tabName: string = 'Particle System';

    // Private members
    private _currentEmitter: string = '';
    private _currentBlendMode: string = '';
    private _currentEmiterType: string = '';

    /**
     * Returns if the object is supported
     * @param object the object selected in the graph
     */
    public isSupported(object: any): boolean {
        return object instanceof ParticleSystem;
    }

    /**
     * Updates the edition tool
     * @param object the object selected in the graph
     */
    public update(ps: ParticleSystem | GPUParticleSystem): void {
        super.update(ps);

        // Misc.
        const scene = this.editor.core.scene;

        // Particle System
        if (ps instanceof ParticleSystem) {
            // Emitter
            const emitter = this.tool.addFolder('Emitter');
            emitter.open();

            if (ps.emitter instanceof Vector3)
                this.tool.addVector(emitter, 'Emitter', ps.emitter);
            else {
                this._currentEmitter = ps.emitter.name;
                const nodes = scene.meshes.map(m => m.name);

                emitter.add(this, '_currentEmitter', nodes).name('Emitter').onFinishChange(r => {
                    const mesh = scene.getMeshByName(r);
                    if (mesh)
                        ps.emitter = mesh;
                });
            }

            // Emitter type
            const emiterType = this.tool.addFolder('Emiter Type');
            emiterType.open();

            this._currentEmiterType = this._getEmiterTypeString(ps);
            const emiterTypes: string[] = [
                'Box',
                'Sphere',
                'Cone'
            ];
            emiterType.add(this, '_currentEmiterType', emiterTypes).name('Emiter Type').onFinishChange(r => {
                switch (r) {
                    case 'Box': ps.createBoxEmitter(ps.direction1, ps.direction2, ps.minEmitBox, ps.maxEmitBox); break;
                    case 'Sphere': ps.createSphereEmitter(10); break;
                    case 'Cone': ps.createConeEmitter(10, 0); break;
                    default: break;
                }

                this.update(ps);
            });

            if (ps.particleEmitterType instanceof SphereParticleEmitter) {
                emiterType.add(ps.particleEmitterType, 'radius').step(0.01).name('Radius');
            }
            else if (ps.particleEmitterType instanceof ConeParticleEmitter) {
                emiterType.add(ps.particleEmitterType, 'radius').step(0.01).name('Radius');
                emiterType.add(ps.particleEmitterType, 'angle').step(0.01).name('Angle');
            }

            // Texture
            const texture = this.tool.addFolder('Texture');
            texture.open();
            this.tool.addTexture(texture, this.editor, 'particleTexture', ps, false).name('Particle Texture');

            const blendModes = ['BLENDMODE_ONEONE', 'BLENDMODE_STANDARD'];
            this._currentBlendMode = blendModes[ps.blendMode];
            texture.add(this, '_currentBlendMode', blendModes).name('Blend Mode').onChange(r => ps.blendMode = ParticleSystem[r]);

            // Actions
            const actions = this.tool.addFolder('Actions');
            actions.open();
            actions.add(ps, 'rebuild').name('Rebuild');

            // Emit
            const emit = this.tool.addFolder('Emit');
            emit.open();
            emit.add(ps, 'emitRate').min(0).step(0.01).name('Emit Rate');
            emit.add(ps, 'minEmitPower').min(0).step(0.01).name('Min Emit Power');
            emit.add(ps, 'maxEmitPower').min(0).step(0.01).name('Max Emit Power');

            // Update
            const update = this.tool.addFolder('Update');
            update.open();
            update.add(ps, 'updateSpeed').min(0).step(0.01).name('Update Speed');

            // Life
            const life = this.tool.addFolder('Life Time');
            life.open();
            life.add(ps, 'minLifeTime').min(0).step(0.01).name('Min Life Time');
            life.add(ps, 'maxLifeTime').min(0).step(0.01).name('Max Life Time');

            // Size
            const size = this.tool.addFolder('Size');
            size.open();
            size.add(ps, 'minSize').min(0).step(0.01).name('Min Size');
            size.add(ps, 'maxSize').min(0).step(0.01).name('Max Size');

            // Angular Speed
            const angular = this.tool.addFolder('Angular Speed');
            angular.open();
            angular.add(ps, 'minAngularSpeed').min(0).step(0.01).name('Min Angular Speed');
            angular.add(ps, 'maxAngularSpeed').min(0).step(0.01).name('Max Angular Speed');

            // Sprite
            if (ps.isAnimationSheetEnabled) {
                const sprite = this.tool.addFolder('Sprite');
                sprite.open();
                sprite.add(ps, 'startSpriteCellID').min(0).step(1).name('Start Sprite Cell ID');
                sprite.add(ps, 'endSpriteCellID').min(0).step(1).name('End Sprite Cell ID');
                sprite.add(ps, 'spriteCellWidth').min(0).step(1).name('Sprite Cell Width');
                sprite.add(ps, 'spriteCellHeight').min(0).step(1).name('Sprite Cell Height');
                sprite.add(ps, 'spriteCellLoop').name('Sprite Cell Loop').onFinishChange(r => ps.spriteCellLoop = r);
                sprite.add(ps, 'spriteCellChangeSpeed').min(0).step(1).name('Sprite Cell Change Speed');
            }

            // Gravity
            this.tool.addVector(this.tool.element, 'Gravity', ps.gravity).open();

            if (ps.particleEmitterType instanceof BoxParticleEmitter) {
                // Direction1
                this.tool.addVector(this.tool.element, 'Direction 1', ps.direction1).open();

                // Direction2
                this.tool.addVector(this.tool.element, 'Direction 2', ps.direction2).open();

                // Min Emit Box
                this.tool.addVector(this.tool.element, 'Min Emit Box', ps.minEmitBox).open();
                
                // Max Emit Box
                this.tool.addVector(this.tool.element, 'Max Emit Box', ps.maxEmitBox).open();
            }

            // Color 1
            this.tool.addColor(this.tool.element, 'Color 1', ps.color1).open();

            // Color 2
            this.tool.addColor(this.tool.element, 'Color 2', ps.color2).open();

            // Color Dead
            this.tool.addColor(this.tool.element, 'Color Dead', ps.colorDead).open();
        }
    }

    // Returns the emiter type as a string
    private _getEmiterTypeString (ps: IParticleSystem): string {
        if (ps.particleEmitterType instanceof BoxParticleEmitter)
            return 'Box';
        
        if (ps.particleEmitterType instanceof SphereParticleEmitter)
            return 'Sphere';

        if (ps.particleEmitterType instanceof ConeParticleEmitter)
            return 'Cone';

        return 'None';
    }
}

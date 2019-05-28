import {
    ParticleSystem, Vector3, IParticleSystem,
    BoxParticleEmitter, SphereParticleEmitter, ConeParticleEmitter,
    SphereDirectedParticleEmitter, ParticleHelper,
    FilesInputStore,
    Tools as BabylonTools,
    Texture
} from 'babylonjs';

import AbstractEditionTool from '../edition-tool';
import Tools from '../../tools/tools';
import UndoRedo from '../../tools/undo-redo';

import Dialog from '../../gui/dialog';

export default class ParticleSystemTool extends AbstractEditionTool<ParticleSystem> {
    // Public members
    public divId: string = 'PARTICLE-SYSTEM-TOOL';
    public tabName: string = 'Particle System';

    // Private members
    private _currentEmitter: string = '';
    private _currentBillboard: string = '';
    private _currentBlendMode: string = '';
    private _currentEmiterType: string = '';
    private _currentTexture: string = '';

    private _isFromScene: boolean = true;

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
    public update(ps: ParticleSystem): void {
        super.update(ps);

        // Misc.
        const scene = this.editor.core.scene;
        this._isFromScene = scene.getParticleSystemByID(ps.id) !== null;

        // Load / save
        const presets = this.tool.addFolder('Presets');
        presets.open();

        presets.add(this, '_saveSet').name('Save...');
        presets.add(this, '_loadSet').name('Load...');

        // Emitter
        const emitter = this.tool.addFolder('Emitter');
        emitter.open();

        emitter.add(ps, 'name').name('Name');

        if (this._isFromScene) {
            emitter.add(ps, 'id').name('Id');

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
        }
        else {
            this.tool.addVector(emitter, 'Emitter', <Vector3> ps.emitter);
        }

        // Emitter type
        const emiterType = this.tool.addFolder('Emiter Type');
        emiterType.open();

        this._currentEmiterType = this._getEmiterTypeString(ps);
        const emiterTypes: string[] = [
            'Box',
            'Sphere',
            'Sphere Directed',
            'Cone'
        ];
        emiterType.add(this, '_currentEmiterType', emiterTypes).name('Emiter Type').onFinishChange(r => {
            switch (r) {
                case 'Box': ps.createBoxEmitter(ps.direction1, ps.direction2, ps.minEmitBox, ps.maxEmitBox); break;
                case 'Sphere': ps.createSphereEmitter(10); break;
                case 'Sphere Directed': ps.createDirectedSphereEmitter(10, ps.direction1, ps.direction2); break;
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

        if (!(ps.particleEmitterType instanceof BoxParticleEmitter))
            emiterType.add(ps.particleEmitterType, 'directionRandomizer').min(0).max(1).step(0.001).name('Direction Randomizer');

        // Texture
        const texture = this.tool.addFolder('Texture');
        texture.open();

        if (this._isFromScene) {
            this.tool.addTexture(texture, this.editor, this.editor.core.scene, 'particleTexture', ps, false, false).name('Particle Texture');
        }
        else {
            const exts = ['png' ,'jpg', 'jpeg', 'bmp'];
            const files = ['None'].concat(Object.keys(FilesInputStore.FilesToLoad).filter(k => exts.indexOf(Tools.GetFileExtension(k)) !== -1));
            this._currentTexture = ps.particleTexture ? files[files.indexOf(ps.particleTexture.name)] || 'None' : 'None';
            texture.add(this, '_currentTexture', files).name('Particle Texture').onChange(r => {
                const file = FilesInputStore.FilesToLoad[r];
                if (!file)
                    return;

                const texture = new Texture('file:' + r, ps.getScene());
                texture.name = texture.url = texture.name.replace('file:', '');
                ps.particleTexture = texture;
            });
        }

        const blendModes = ['BLENDMODE_ONEONE', 'BLENDMODE_STANDARD'];
        this._currentBlendMode = blendModes[ps.blendMode] || 'BLENDMODE_ONEONE';
        texture.add(this, '_currentBlendMode', blendModes).name('Blend Mode').onChange(r => ps.blendMode = ParticleSystem[r]);

        // Actions
        const actions = this.tool.addFolder('Actions');
        actions.open();
        actions.add(ps, 'preventAutoStart').name('Prevent Auto Start');
        actions.add(ps, 'rebuild').name('Rebuild');
        actions.add(ps, 'start').name('Start');
        actions.add(ps, 'stop').name('Stop');

        // Billboard
        const modes: string[] = ['BILLBOARDMODE_ALL', 'BILLBOARDMODE_Y', 'BILLBOARDMODE_STRETCHED'];
        this._currentBillboard = 'None';
        switch (ps.billboardMode) {
            case ParticleSystem.BILLBOARDMODE_ALL: this._currentBillboard = 'BILLBOARDMODE_ALL'; break;
            case ParticleSystem.BILLBOARDMODE_Y: this._currentBillboard = 'BILLBOARDMODE_Y'; break;
            case ParticleSystem.BILLBOARDMODE_STRETCHED: this._currentBillboard = 'BILLBOARDMODE_STRETCHED'; break;
            default: debugger; break;
        }

        const billboard = this.tool.addFolder('Billboarding');
        billboard.open();
        billboard.add(ps, 'isBillboardBased').name('Is Billboard Based');
        billboard.add(this, '_currentBillboard', modes).name('Billboard Type').onChange(r => {
            const from = ps.billboardMode;
            const to = ParticleSystem[r];

            UndoRedo.Push({ baseObject: ps, property: 'billboardMode', from: from, to: to });
        });

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
        update.add(ps, 'startDelay').min(0).name('Start Delay (ms)');
        update.add(ps, 'targetStopDuration').min(0).name('Stop Duration (seconds)');

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
            // sprite.add(ps, 'spriteCellLoop').name('Sprite Cell Loop').onFinishChange(r => ps.spriteCellLoop = r);
            sprite.add(ps, 'spriteCellChangeSpeed').min(0).step(1).name('Sprite Cell Change Speed');
        }

        // Gravity
        this.tool.addVector(this.tool.element, 'Gravity', ps.gravity).open();

        if (ps.particleEmitterType instanceof BoxParticleEmitter || ps.particleEmitterType instanceof SphereDirectedParticleEmitter) {
            // Direction1
            this.tool.addVector(this.tool.element, 'Direction 1', ps.direction1).open();

            // Direction2
            this.tool.addVector(this.tool.element, 'Direction 2', ps.direction2).open();

            if (ps.particleEmitterType instanceof BoxParticleEmitter) {
                // Min Emit Box
                this.tool.addVector(this.tool.element, 'Min Emit Box', ps.minEmitBox).open();
                
                // Max Emit Box
                this.tool.addVector(this.tool.element, 'Max Emit Box', ps.maxEmitBox).open();
            }
        }

        // Color 1
        this.tool.addColor(this.tool.element, 'Color 1', ps.color1).open();

        // Color 2
        this.tool.addColor(this.tool.element, 'Color 2', ps.color2).open();

        // Color Dead
        this.tool.addColor(this.tool.element, 'Color Dead', ps.colorDead).open();

        // Animations
        if (!this._isFromScene) {
            const animations = this.tool.addFolder('Animations');
            animations.open();

            ps.beginAnimationOnStart = ps.beginAnimationOnStart || false;
            animations.add(ps, 'beginAnimationOnStart').name('Begin Animations On Start');
            
            ps.beginAnimationFrom = ps.beginAnimationFrom || 0;
            animations.add(ps, 'beginAnimationFrom').min(0).step(1).name('Begin Animation From');

            ps.beginAnimationTo = ps.beginAnimationTo || 60;
            animations.add(ps, 'beginAnimationTo').min(0).step(1).name('Begin Animation To');

            ps.beginAnimationLoop = ps.beginAnimationLoop || false;
            animations.add(ps, 'beginAnimationLoop').name('Begin Animation Loop');
        }
    }

    // Returns the emiter type as a string
    private _getEmiterTypeString (ps: IParticleSystem): string {
        if (ps.particleEmitterType instanceof BoxParticleEmitter) return 'Box';
        if (ps.particleEmitterType instanceof SphereDirectedParticleEmitter) return 'Sphere Directed';
        if (ps.particleEmitterType instanceof SphereParticleEmitter) return 'Sphere';
        if (ps.particleEmitterType instanceof ConeParticleEmitter) return 'Cone';
        return 'None';
    }

    // Exports the current set
    private async _saveSet (): Promise<void> {
        // Export
        const set = ParticleHelper.ExportSet([this.object]);
        const serializationObject = set.serialize();

        // Embed?
        const embed = await Dialog.Create('Embed textures?', 'Do you want to embed textures in the set?');
        if (embed === 'Yes') {
            for (const s of serializationObject.systems) {
                const file = FilesInputStore.FilesToLoad[s.textureName.toLowerCase()];
                if (!file)
                    continue;
                s.textureName = await Tools.ReadFileAsBase64(file);
            }
        }

        // Save
        const json = JSON.stringify(serializationObject, null, '\t');
        const file = Tools.CreateFile(Tools.ConvertStringToUInt8Array(json), this.object.name + '.json');
        BabylonTools.Download(file, file.name);
    }

    // Loads the selected preset from files open dialog
    private async _loadSet (): Promise<void> {
        const files = await Tools.OpenFileDialog();
        const content = JSON.parse(await Tools.ReadFileAsText(files[0]));

        if (!content.systems || content.systems.length === 0)
            return;

        const savedEmitter = this.object.emitter;

        const rootUrl = content.systems[0].textureName.indexOf('data:') === 0 ? '' : 'file:';
        ParticleSystem._Parse(content.systems[0], this.object, this.object.getScene(), rootUrl);

        this.object.emitter = savedEmitter;
    }
}

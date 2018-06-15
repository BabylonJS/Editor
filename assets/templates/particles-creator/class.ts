class CustomParticles extends BABYLON.ParticleSystem {
    // Public members
    public scaledUpdateSpeed: number;
    public scaledDirection: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    public scaledColorStep: BABYLON.Color4 = new BABYLON.Color4(0, 0, 0, 0);
    public scaledGravity: BABYLON.Vector3 = BABYLON.Vector3.Zero();

    /**
     * Update all particles for current frame
     * @param particles: all new particles alive
     */
    public update (system: ParticleSystem, particles: BABYLON.Particle[]): void {
        // Misc.
        this.scaledUpdateSpeed = system.updateSpeed * scene.getAnimationRatio();

        // For each particle
        for (var index = 0; index < particles.length; index++) {
            var particle = particles[index];
            particle.age += this.scaledUpdateSpeed;

            if (particle.age >= particle.lifeTime) { // Recycle by swapping with last particle
                this._emitFromParticle(particle);
                this.recycleParticle(particle);
                index--;
                continue;
            }
            else {
                particle.colorStep.scaleToRef(this.scaledUpdateSpeed, this.scaledColorStep);
                particle.color.addInPlace(this.scaledColorStep);

                if (particle.color.a < 0)
                    particle.color.a = 0;

                particle.angle += particle.angularSpeed * this.scaledUpdateSpeed;

                particle.direction.scaleToRef(this.scaledUpdateSpeed, this.scaledDirection);
                particle.position.addInPlace(this.scaledDirection);

                system.gravity.scaleToRef(this.scaledUpdateSpeed, this.scaledGravity);
                particle.direction.addInPlace(this.scaledGravity);

                if (system._isAnimationSheetEnabled) {
                    particle.updateCellIndex(this.scaledUpdateSpeed);
                }
            }
        }
    }

    /**
     * 
     * @param particle 
     */
    public recycleParticle (particle: Particle): void {
        var lastParticle = <Particle>this._particles.pop();

        if (lastParticle !== particle) {
            lastParticle.copyTo(particle);
        }
        this._stockParticles.push(lastParticle);
    }

    /**
     * 
     * @param particle 
     */
    public emitFromParticle (particle: Particle): void {
        if (!this.subEmitters || this.subEmitters.length === 0) {
            return;
        }

        var templateIndex = Math.floor(Math.random() * this.subEmitters.length);

        var subSystem = this.subEmitters[templateIndex].clone(this.name + "_sub", particle.position.clone());
        subSystem._rootParticleSystem = this;
        this.activeSubSystems.push(subSystem);
        subSystem.start();
    }
}

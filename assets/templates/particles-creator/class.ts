class CustomParticles {
    // Public members
    public finalSize: number = 2;

    /**
     * Constructor
     */
    constructor () {
        // Scope
        const scope = this;
        
        // Custom update function
        particleSystem.updateFunction = function (particles: BABYLON.Particle[]) {
            for (var index = 0; index < particles.length; index++) {
                var particle = particles[index];
                particle.age += this._scaledUpdateSpeed;

                if (particle.age < particle.lifeTime * .35) {
                    particle.size = scope.finalSize * particle.age / (particle.lifeTime * 0.35);
                }

                if (particle.age >= particle.lifeTime) { // Recycle by swapping with last particle
                    this.recycleParticle(particle);
                    index--;
                    continue;
                }
                else {
                    var speed = this._scaledUpdateSpeed * 2;
                    if (particle.age >= particle.lifeTime / 2) {
                        speed = -speed;
                    }
                    
                    particle.colorStep.scaleToRef(speed, this._scaledColorStep);
                    particle.color.addInPlace(this._scaledColorStep);

                    if (particle.color.a < 0)
                        particle.color.a = 0;

                    particle.angle += particle.angularSpeed * this._scaledUpdateSpeed;
                    particle.direction.scaleToRef(this._scaledUpdateSpeed, this._scaledDirection);
                    particle.position.addInPlace(this._scaledDirection);

                    this.gravity.scaleToRef(this._scaledUpdateSpeed, this._scaledGravity);
                    particle.direction.addInPlace(this._scaledGravity);
                }
            }
        }
    }

    /**
     * Set the uniforms and samplers of the shader
     * @param uniforms the shader's uniforms
     * @param samplers the shader's samplers
     */
    public setUniforms (uniforms: string[], samplers: string[]): void {

    }

    /**
     * Set the defines of the shader
     * @param defines the defines for the shader
     */
    public setDefines (defines: string[]): void {
        defines.push('#define CUSTOM_DEFINE');
    }

    /**
     * On bind the particle system shader
     * @param effect the effect for the particles
     */
    public onBind (effect: BABYLON.Effect): void {

    }
}

return {
    ctor: CustomParticles,
    finalSize: 2
};

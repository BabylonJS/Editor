import { Scene, Mesh, NodeParticleSystemSet, ParticleSystemSet, Tools, Matrix, Vector3, Quaternion, Tags, GetClass, Node } from "babylonjs";

import { UniqueNumber } from "../../tools/tools";
import { setParticleSystemVisibleInGraph } from "../../tools/particles/metadata";
import { isParticleSystem, isGPUParticleSystem } from "../../tools/guards/particles";

export class NodeParticleSystemSetMesh extends Mesh {
	/**
	 * Defines the reference to the associated Particle System Set created from the node particle system set.
	 */
	public particleSystemSet: ParticleSystemSet | null = null;
	/**
	 * Defines the reference to the associated Node Particle System Set.
	 */
	public nodeParticleSystemSet: NodeParticleSystemSet | null = null;

	/**
	 * Constructor.
	 * @param name defines the name of mesh.
	 * @param scene defines the scene the mesh belongs to.
	 */
	public constructor(name: string, scene: Scene, parent?: Node | null, source?: Mesh, doNotCloneChildren?: boolean, clonePhysicsImpostor?: boolean) {
		super(name, scene, parent, source, doNotCloneChildren, clonePhysicsImpostor);
	}

	public async buildNodeParticleSystemSet(data: any): Promise<void> {
		if (this.particleSystemSet) {
			this.particleSystemSet.emitterNode = null;
			this.particleSystemSet.dispose();
			this.particleSystemSet = null;
		}

		this.nodeParticleSystemSet?.dispose();
		this.nodeParticleSystemSet = null;

		this.nodeParticleSystemSet = NodeParticleSystemSet.Parse(data);
		this.nodeParticleSystemSet.id = data.id;
		this.nodeParticleSystemSet.uniqueId = data.uniqueId;

		const particleSystemSet = await this.nodeParticleSystemSet.buildAsync(this._scene, false);
		this.particleSystemSet = particleSystemSet;

		particleSystemSet.emitterNode = this;
		particleSystemSet["_emitterNodeIsOwned"] = false;

		particleSystemSet.systems.forEach((particleSystem) => {
			particleSystem.id = Tools.RandomId();
			particleSystem.uniqueId = UniqueNumber.Get();

			if (isParticleSystem(particleSystem) || isGPUParticleSystem(particleSystem)) {
				setParticleSystemVisibleInGraph(particleSystem, false);
			}
		});
		particleSystemSet.start();
	}

	/**
	 * Releases resources associated with this scene link.
	 */
	public dispose(): void {
		super.dispose(false, true);
	}

	/**
	 * Gets the current object class name.
	 * @return the class name
	 */
	public getClassName(): string {
		return "NodeParticleSystemSetMesh";
	}

	public clone(name?: string, newParent?: Node | null, doNotCloneChildren?: boolean, clonePhysicsImpostor?: boolean): NodeParticleSystemSetMesh {
		const clone = new NodeParticleSystemSetMesh(name ?? this.name, this.getScene(), newParent, this, doNotCloneChildren, clonePhysicsImpostor);

		if (this.nodeParticleSystemSet) {
			clone.buildNodeParticleSystemSet({
				...this.nodeParticleSystemSet.serialize(),
				id: this.nodeParticleSystemSet.id,
				uniqueId: this.nodeParticleSystemSet.uniqueId,
			});
		}

		return clone;
	}

	public serialize(serializationObject: any = {}): any {
		super.serialize(serializationObject);

		serializationObject.isNodeParticleSystemMesh = true;
		serializationObject.nodeParticleSystemSet = this.nodeParticleSystemSet
			? {
					...this.nodeParticleSystemSet.serialize(),
					id: this.nodeParticleSystemSet.id,
					uniqueId: this.nodeParticleSystemSet.uniqueId,
				}
			: undefined;

		return serializationObject;
	}

	public static override Parse(parsedMesh: any, scene: Scene, _rootUrl: string): NodeParticleSystemSetMesh {
		const mesh = new NodeParticleSystemSetMesh(parsedMesh.name, scene);

		if (parsedMesh.nodeParticleSystemSet) {
			mesh.buildNodeParticleSystemSet(parsedMesh.nodeParticleSystemSet);
		}

		mesh.id = parsedMesh.id;
		mesh._waitingParsedUniqueId = parsedMesh.uniqueId;

		if (Tags) {
			Tags.AddTagsTo(mesh, parsedMesh.tags);
		}

		mesh.position = Vector3.FromArray(parsedMesh.position);

		if (parsedMesh.metadata !== undefined) {
			mesh.metadata = parsedMesh.metadata;
		}

		if (parsedMesh.rotationQuaternion) {
			mesh.rotationQuaternion = Quaternion.FromArray(parsedMesh.rotationQuaternion);
		} else if (parsedMesh.rotation) {
			mesh.rotation = Vector3.FromArray(parsedMesh.rotation);
		}

		mesh.scaling = Vector3.FromArray(parsedMesh.scaling);

		if (parsedMesh.localMatrix) {
			mesh.setPreTransformMatrix(Matrix.FromArray(parsedMesh.localMatrix));
		} else if (parsedMesh.pivotMatrix) {
			mesh.setPivotMatrix(Matrix.FromArray(parsedMesh.pivotMatrix));
		}

		mesh.setEnabled(parsedMesh.isEnabled);
		mesh.isVisible = parsedMesh.isVisible;

		if (parsedMesh.billboardMode !== undefined) {
			mesh.billboardMode = parsedMesh.billboardMode;
		}

		mesh._shouldGenerateFlatShading = parsedMesh.useFlatShading;

		// freezeWorldMatrix
		if (parsedMesh.freezeWorldMatrix) {
			mesh._waitingData.freezeWorldMatrix = parsedMesh.freezeWorldMatrix;
		}

		// Parent
		if (parsedMesh.parentId !== undefined) {
			mesh._waitingParentId = parsedMesh.parentId;
		}

		if (parsedMesh.parentInstanceIndex !== undefined) {
			mesh._waitingParentInstanceIndex = parsedMesh.parentInstanceIndex;
		}

		// Animations
		if (parsedMesh.animations) {
			for (let animationIndex = 0; animationIndex < parsedMesh.animations.length; animationIndex++) {
				const parsedAnimation = parsedMesh.animations[animationIndex];
				const internalClass = GetClass("BABYLON.Animation");
				if (internalClass) {
					mesh.animations.push(internalClass.Parse(parsedAnimation));
				}
			}
			Node.ParseAnimationRanges(mesh, parsedMesh, scene);
		}

		if (parsedMesh.autoAnimate) {
			scene.beginAnimation(mesh, parsedMesh.autoAnimateFrom, parsedMesh.autoAnimateTo, parsedMesh.autoAnimateLoop, parsedMesh.autoAnimateSpeed || 1.0);
		}

		// Layer Mask
		if (parsedMesh.layerMask && !isNaN(parsedMesh.layerMask)) {
			mesh.layerMask = Math.abs(parseInt(parsedMesh.layerMask));
		} else {
			mesh.layerMask = 0x0fffffff;
		}

		return mesh;
	}
}

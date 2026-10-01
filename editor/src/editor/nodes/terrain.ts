import { GroundMesh, MeshCloneOptions, Node, Nullable, Scene, Tools } from "babylonjs";

import { UniqueNumber } from "../../tools/tools";

export class TerrainMesh extends GroundMesh {
	/**
	 * Constructor.
	 * @param name defines the name of the terrain.
	 * @param scene defines the reference to the scene where to add the terrain.
	 */
	public constructor(name: string, scene: Scene) {
		super(name, scene);

		this.id = Tools.RandomId();
		this.uniqueId = UniqueNumber.Get();
	}

	/**
	 * Gets the current object class name.
	 * @return the class name
	 */
	public getClassName(): string {
		return "TerrainMesh";
	}

	/**
	 * Returns a new terrain sharing the geometry of this terrain (Mesh.clone would create a Mesh).
	 * @param name defines the name of the clone.
	 * @param newParent defines the parent of the clone, or the clone options.
	 * @param doNotCloneChildren defines whether the children are not cloned (default false).
	 * @param clonePhysicsImpostor defines whether the physics body is cloned (default true).
	 */
	public clone(name: string = "", newParent: Nullable<Node> | MeshCloneOptions = null, doNotCloneChildren?: boolean, clonePhysicsImpostor: boolean = true): TerrainMesh {
		let parent: Nullable<Node> = null;
		let cloneThinInstances = false;

		if (newParent && (newParent as Node)._addToSceneRootNodes === undefined) {
			const options = newParent as MeshCloneOptions;

			parent = options.parent ?? null;
			doNotCloneChildren = options.doNotCloneChildren;
			clonePhysicsImpostor = options.clonePhysicsImpostor ?? true;
			cloneThinInstances = options.cloneThinInstances ?? false;
		} else {
			parent = newParent as Nullable<Node>;
		}

		const terrain = new TerrainMesh(name, this.getScene());
		terrain._copySource(this, doNotCloneChildren, clonePhysicsImpostor, cloneThinInstances);

		// Private members are not deep copied.
		terrain._subdivisionsX = this._subdivisionsX;
		terrain._subdivisionsY = this._subdivisionsY;
		terrain._width = this._width;
		terrain._height = this._height;
		terrain._minX = this._minX;
		terrain._maxX = this._maxX;
		terrain._minZ = this._minZ;
		terrain._maxZ = this._maxZ;

		if (parent !== null) {
			terrain.parent = parent;
		}

		return terrain;
	}

	/**
	 * Serializes the terrain as a ground (any loader reads it) flagged `isTerrainMesh`: the editor parses it as a TerrainMesh and
	 * babylonjs-editor-tools augments the ground instance at runtime.
	 * @param serializationObject defines the object to write to.
	 */
	public serialize(serializationObject: any = {}): any {
		super.serialize(serializationObject);

		serializationObject.type = "GroundMesh";
		serializationObject.isTerrainMesh = true;

		return serializationObject;
	}

	/**
	 * Parses a serialized terrain (the GroundMesh part: Mesh.Parse reads the rest).
	 * @param parsedMesh defines the serialized mesh.
	 * @param scene defines the scene to create the terrain in.
	 */
	public static Parse(parsedMesh: any, scene: Scene): TerrainMesh {
		const terrain = new TerrainMesh(parsedMesh.name, scene);

		terrain._subdivisionsX = parsedMesh.subdivisionsX || 1;
		terrain._subdivisionsY = parsedMesh.subdivisionsY || 1;
		terrain._minX = parsedMesh.minX;
		terrain._maxX = parsedMesh.maxX;
		terrain._minZ = parsedMesh.minZ;
		terrain._maxZ = parsedMesh.maxZ;
		terrain._width = parsedMesh.width;
		terrain._height = parsedMesh.height;

		return terrain;
	}
}

Node.AddNodeConstructor("TerrainMesh", (name, scene) => {
	return () => new TerrainMesh(name, scene);
});

import { Scene, NodeMaterialBlock } from "babylonjs";

const _deserialize = NodeMaterialBlock.prototype._deserialize;
NodeMaterialBlock.prototype._deserialize = function (serializationObject: any, scene: Scene, rootUrl: string): void {
	_deserialize.call(this, serializationObject, scene, rootUrl);
	this.uniqueId = serializationObject.id;
}

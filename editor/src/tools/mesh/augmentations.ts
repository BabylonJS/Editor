import { GaussianSplattingMesh, PhysicsAggregate } from "babylonjs";

import { GaussianSplattingPartProxyMesh as _GaussianSplattingPartProxyMesh } from "babylonjs/Meshes/GaussianSplatting/gaussianSplattingPartProxyMesh";

declare module "babylonjs" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface AbstractMesh {
		_waitingLod?: any;
		physicsAggregate?: PhysicsAggregate | null;
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface GaussianSplattingPartProxyMesh extends _GaussianSplattingPartProxyMesh {
		baseGaussianSplattingMesh?: GaussianSplattingMesh;
	}
}

declare module "babylonjs/Meshes/GaussianSplatting/gaussianSplattingPartProxyMesh" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface GaussianSplattingPartProxyMesh {
		baseGaussianSplattingMesh?: GaussianSplattingMesh;
	}
}

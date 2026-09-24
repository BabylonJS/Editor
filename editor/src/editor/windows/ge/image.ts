import { isAbsolute, join } from "path/posix";

import { Image } from "babylonjs-gui";
import { RegisterClass } from "babylonjs";

let projectPath: string = "";

export function imageUrlRewriter(url: string) {
	if (isAbsolute(url)) {
		return url;
	}

	if (url.startsWith("http://") || url.startsWith("https://")) {
		return url;
	}

	return join(projectPath, url);
}

export class GEImage extends Image {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	private __urlRewriter: ((url: string) => string) | null = null;

	public constructor(...args: ConstructorParameters<typeof Image>) {
		super(...args);

		Object.defineProperty(this, "_urlRewriter", {
			get: () => this.__urlRewriter,
			set: (rewriter: ((url: string) => string) | null) => {
				if (rewriter) {
					this.__urlRewriter = rewriter;
				}
			},
		});

		this._urlRewriter = (url: string) => imageUrlRewriter(url);
	}

	public override serialize(serializationObject: any, force?: boolean, allowCanvas?: boolean): void {
		super.serialize(serializationObject, force, allowCanvas);

		if (serializationObject.source) {
			serializationObject.source = serializationObject.source.replace(projectPath, "");
		}
	}
}

let registered = false;

export function registerGEImage(path: string) {
	if (registered) {
		return;
	}

	projectPath = join(path, "/");
	registered = true;

	RegisterClass("BABYLON.GUI.Image", GEImage);
}

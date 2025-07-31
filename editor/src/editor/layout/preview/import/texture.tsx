import { extname } from "path/posix";

import { FaMagic } from "react-icons/fa";

import { CubeTexture, Texture, ColorGradingTexture, PickingInfo } from "babylonjs";

import { showDialog } from "../../../../ui/dialog";
import { Button } from "../../../../ui/shadcn/ui/button";
import { Separator } from "../../../../ui/shadcn/ui/separator";

import { isScene } from "../../../../tools/guards/scene";
import { aiGenerateMesh } from "../../../../tools/ai/generate";
import { isAbstractMesh } from "../../../../tools/guards/nodes";
import { isCubeTexture } from "../../../../tools/guards/texture";
import { registerSimpleUndoRedo } from "../../../../tools/undoredo";
import { onTextureAddedObservable } from "../../../../tools/observables";
import { isPBRMaterial, isStandardMaterial } from "../../../../tools/guards/material";

import { Editor } from "../../../main";

import { configureImportedTexture } from "./import";

export interface IApplyTextureToObjectOptions {
	/**
	 * Defines the reference to the editor.
	 */
	editor: Editor;
	/**
	 * Defines the reference to the object where to apply the texture. The type of the object is tested.
	 */
	object: any;
	/**
	 * Defines the absolute path to the texture asset file (.png, .env, .jpg, etc.).
	 */
	absolutePath: string;
	/**
	 * Defines the reference to the pick info where the texture was dropped in the scene.
	 */
	pickInfo?: PickingInfo;
}

/**
 * Applies the texture asset located at the given absolute path to the given object.
 */
export function applyTextureAssetToObject(options: IApplyTextureToObjectOptions) {
	if (!isScene(options.object) && !isAbstractMesh(options.object)) {
		return;
	}

	if (isAbstractMesh(options.object) && !options.object.material) {
		return;
	}

	const extension = extname(options.absolutePath).toLowerCase();

	switch (extension) {
		case ".env":
			const newCubeTexture = configureImportedTexture(
				CubeTexture.CreateFromPrefilteredData(options.absolutePath, isScene(options.object) ? options.object : options.object.getScene())
			);
			applyTextureToObject(newCubeTexture, options);
			break;

		case ".jpg":
		case ".png":
		case ".webp":
		case ".bmp":
		case ".jpeg":
			const newTexture = configureImportedTexture(new Texture(options.absolutePath, isScene(options.object) ? options.object : options.object.getScene()));

			applyTextureToObject(newTexture, options);

			onTextureAddedObservable.notifyObservers(newTexture);
			break;
	}
}

/**
 * Applies the given texture to the given object. Tries to determine the correct slot to apply the texture.
 * If fails, asks to choose the slot (albedo, bump, etc.).
 * @param texture defines the reference to the texture instance to apply on the object.
 */
export function applyTextureToObject(texture: Texture | CubeTexture | ColorGradingTexture, options: IApplyTextureToObjectOptions): void {
	if (isCubeTexture(texture) && isScene(options.object)) {
		return registerSimpleUndoRedo({
			object: options.object,
			newValue: texture,
			executeRedo: true,
			property: "environmentTexture",
			oldValue: options.object.environmentTexture,
			onLost: () => texture.dispose(),
		});
	}

	if (!isAbstractMesh(options.object)) {
		return;
	}

	const material = options.object.material;
	if (!material) {
		return;
	}

	function TextureSlotComponent({ property }) {
		return (
			<Button
				variant="ghost"
				className="w-full"
				onClick={() => {
					registerSimpleUndoRedo({
						property,
						object: material,
						newValue: texture,
						executeRedo: true,
						oldValue: material![property],
						onLost: () => texture.dispose(),
					});

					// eslint-disable-next-line no-use-before-define
					dialog.close();
					options.editor.layout.inspector.forceUpdate();
				}}
			>
				{property}
			</Button>
		);
	}

	function AISlotComponent() {
		return (
			<Button
				variant="secondary"
				className="gap-2"
				onClick={() => {
					// eslint-disable-next-line no-use-before-define
					dialog.close();
					aiGenerateMesh(options.editor, options.pickInfo, {
						imageAbsolutePath: options.absolutePath,
					});
				}}
			>
				<FaMagic className="w-4 h-4" /> Create 3D Model
			</Button>
		);
	}

	const title = (
		<div>
			Apply texture
			<br />
			<b className="text-muted-foreground font-semibold tracking-tighter">{material.name}</b>
		</div>
	);

	const dialog = showDialog(
		title,
		<div className="flex flex-col gap-1 w-64 pt-4">
			{isPBRMaterial(material) && (
				<>
					<TextureSlotComponent property="albedoTexture" />
					<TextureSlotComponent property="bumpTexture" />
					<TextureSlotComponent property="reflectivityTexture" />
					<TextureSlotComponent property="ambientTexture" />
					<TextureSlotComponent property="metallicTexture" />
					<TextureSlotComponent property="reflectionTexture" />
				</>
			)}

			{isStandardMaterial(material) && (
				<>
					<TextureSlotComponent property="diffuseTexture" />
					<TextureSlotComponent property="bumpTexture" />
					<TextureSlotComponent property="specularTexture" />
					<TextureSlotComponent property="ambientTexture" />
					<TextureSlotComponent property="reflectionTexture" />
				</>
			)}

			<Separator className="my-3" />
			<AISlotComponent />
		</div>
	);
}

import { ReactNode } from "react";

import { GiSkeletonInside } from "react-icons/gi";

import { SceneLoader, Debug } from "babylonjs";

import { AssetsBrowserItem } from "./item";
import { ContextMenuItem } from "../../../../ui/shadcn/ui/context-menu";

export class AssetBrowserSkeletonItem extends AssetsBrowserItem {
	/**
	 * @override
	 */
	protected getContextMenuContent(): ReactNode {
		return (
			<>
				<ContextMenuItem className="flex items-center gap-2" onClick={() => this._handleLoadSkeletonToScene()}>
					<GiSkeletonInside className="w-5 h-5" /> Load to Scene
				</ContextMenuItem>
			</>
		);
	}

	/**
	 * @override
	 */
	protected getIcon(): ReactNode {
		return <GiSkeletonInside size="64px" />;
	}

	/**
	 * @override
	 */
	protected async onDoubleClick(): Promise<void> {
		await this._handleLoadSkeletonToScene();
	}

	private async _handleLoadSkeletonToScene(): Promise<void> {
		const scene = this.props.editor.layout.preview.scene;
		if (!scene) {
			return;
		}

		try {
			// Load the BVH file using SceneLoader
			const result = await SceneLoader.ImportMeshAsync("", "", this.props.absolutePath, scene);

			// Get the skeleton from the result
			const skeleton = result.skeletons[0];

			if (skeleton) {
				// Create a skeleton viewer to visualize the skeleton
				const viewer = new Debug.SkeletonViewer(skeleton, null, scene, false, 1, {
					displayMode: Debug.SkeletonViewer.DISPLAY_SPHERE_AND_SPURS,
				});
				viewer.isEnabled = true;

				// Start the animation if available
				const highestFrame = skeleton.bones[0]?.animations[0]?.getHighestFrame() ?? 60;
				scene.beginAnimation(skeleton, 0, highestFrame, true);

				// Notify the user
				this.props.editor.layout.console.log(`Loaded skeleton: ${skeleton.name} with ${skeleton.bones.length} bones`);
			} else {
				this.props.editor.layout.console.warn("No skeleton found in the BVH file");
			}
		} catch (error) {
			console.error("Failed to load BVH file:", error);
			this.props.editor.layout.console.error(`Failed to load BVH file: ${error}`);
		}
	}
}

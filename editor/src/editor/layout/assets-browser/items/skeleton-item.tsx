import { ReactNode } from "react";
import { extname, basename } from "path";

import { GiSkeletonInside } from "react-icons/gi";

import { TransformNode, Tools, Debug, SceneLoader, Skeleton, Scene } from "babylonjs";

import { AssetsBrowserItem } from "./item";
import { ContextMenuItem } from "../../../../ui/shadcn/ui/context-menu";
import { UniqueNumber } from "../../../../tools/tools";

const DEFAULT_ANIMATION_FRAMES = 60;
const SKELETON_VIEWER_SCALE = 1;
const SKELETON_CONTAINER_SUFFIX = "_Container";
export const SKELETON_CONTAINER_TYPE = "SkeletonContainer";

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

	private async _handleLoadSkeletonToScene(): Promise<void> {
		const scene = this.props.editor.layout.preview.scene;
		try {
			const result = await SceneLoader.ImportMeshAsync("", "", this.props.absolutePath, scene);

			const skeleton = result.skeletons[0];

			if (skeleton) {
				// Define the skeleton name from the file name
				const extension = extname(this.props.absolutePath).toLowerCase();
				if (extension === ".bvh") {
					const skeletonName = basename(this.props.absolutePath, extension);
					skeleton.name = skeletonName;
				}

				this._createSkeletonContainer(skeleton, scene);
				this.props.editor.layout.graph.refresh();
			}
		} catch (error) {
			this.props.editor.layout.console.error(`Failed to load BVH file: ${error}`);
		}
	}

	/**
	 * Creates a skeleton container with viewer and animation
	 */
	private _createSkeletonContainer(skeleton: Skeleton, scene: Scene): void {
		const skeletonContainer = new TransformNode(`${skeleton.name}${SKELETON_CONTAINER_SUFFIX}`, scene);
		skeletonContainer.id = Tools.RandomId();
		skeletonContainer.uniqueId = UniqueNumber.Get();

		const viewer = new Debug.SkeletonViewer(skeleton, null, scene, false, SKELETON_VIEWER_SCALE, {
			displayMode: Debug.SkeletonViewer.DISPLAY_SPHERE_AND_SPURS,
		});
		viewer.isEnabled = true;

		// Store the skeleton reference and viewer in the container's metadata for easy access
		skeletonContainer.metadata = {
			...skeletonContainer.metadata,
			skeleton: skeleton,
			viewer: viewer,
			type: SKELETON_CONTAINER_TYPE,
		};

		const highestFrame = skeleton.bones[0]?.animations[0]?.getHighestFrame() ?? DEFAULT_ANIMATION_FRAMES;
		scene.beginAnimation(skeleton, 0, highestFrame, true);

		this.props.editor.layout.console.log(`Loaded skeleton: ${skeleton.name} with ${skeleton.bones.length} bones`);
	}
}

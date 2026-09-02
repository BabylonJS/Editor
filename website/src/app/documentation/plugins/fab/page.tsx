"use client";

import { Callout, CustomLink, DocPage, DocHeading, DocVideo } from "../../components";

export default function DocumentationUsingFabPluginPage() {
	return (
		<DocPage>
			<DocHeading level={2}>Introduction</DocHeading>

			<p>
				<CustomLink href="https://www.fab.com">Fab.com</CustomLink> is a tool-agnostic marketplace for digital assets created by{" "}
				<CustomLink href="https://www.epicgames.com">Epic Games</CustomLink>. It allows creators to sell 3D models, textures, and other digital assets to a wide audience.
				<br />
				Download an asset from Fab and export it to your favorite software. The Fab plugin for Babylon.js Editor allows you to import these assets directly into your
				project.
			</p>

			<DocHeading level={2}>Prerequisites</DocHeading>

			<p>
				In order to use Fab and download/export assets, you need an active <b>Epic Games account</b> and the <b>Epic Games Launcher</b> installed on your computer.
			</p>

			<DocHeading level={2}>Installing the plugin</DocHeading>

			<p>
				The Babylon.js Editor Fab plugin is available as a{" "}
				<CustomLink href="https://www.npmjs.com/package/babylonjs-editor-fab-plugin">
					<b>npm package</b>
				</CustomLink>
				. To install a plugin, simply open the <b>Project Settings</b> in the Babylon.js Editor, go to the <b>Plugins</b> tab, click the <b>Add button</b> and select{" "}
				<b>From npm</b>.
			</p>

			<p>
				Then enter the name of the plugin to add. The name of the Fab plugin is <b className="underline underline-offset-4">babylonjs-editor-fab-plugin</b>.
			</p>

			<p>
				Once installed, a new tab named <b>Fab</b> will be available in the Editor's layout. This tab will show all the assets that were exported using Fab and can be
				imported into the current project.
			</p>

			<DocVideo src="/documentation/plugins/fab/installing.mp4" />

			<DocHeading level={2}>Importing</DocHeading>

			<div className="flex flex-col gap-2">
				<p>For now, supported asset types are:</p>

				<ul className="list-disc pl-6 space-y-1">
					<li>For 3D models: GLTF, GLB, OBJ and FBX.</li>
					<li>For materials: Texture Set</li>
				</ul>
			</div>

			<p>
				To import assets from Fab, download any asset from the <b>Fab section in the Epic Games Launcher</b> by selecting the right file format before and select the{" "}
				<b>Export target</b> to be <b>Custom (socket port)</b>. Once done, simply click the <b>Export</b> button.
			</p>

			<Callout type="note" title="Collections">
				In case of a collection of multiple assets, Fab will ask you if you want to export all assets. All assets will be imported in the project's root folder{" "}
				<b>assets/fab</b> and any unused assets can be deleted later.
			</Callout>

			<p>
				Once exported, the Editor will perform all necessary conversions and optimizations for assets such as the merge of textures for metallic-roughness materials (ORM)
				etc. According to the size of the asset(s), this process can take a few seconds to a couple of minutes.
			</p>

			<DocVideo src="/documentation/plugins/fab/importing.mp4" />

			<DocHeading level={2}>Instantiating</DocHeading>

			<p>
				To instantiate an imported Fab asset into the scene, simply select it from the Fab tab and drag'n'drop it into the preview panel like any other asset.
				<br />
				Because Fab assets are described by a collection of meshes and materials, the plugin will automatically assign pre-configured materials to the meshes when
				instantiating them.
			</p>

			<p>
				For a manual import, you can simply navigate to the <b>assets/fab</b> folder in the <b>Assets browser</b> panel and drag'n'drop the desired asset into the preview
				or the graph panels. Doing that allows you to use available assets such as materials separately.
			</p>

			<DocVideo src="/documentation/plugins/fab/instantiating.mp4" />
		</DocPage>
	);
}

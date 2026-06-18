"use client";

import Link from "next/link";
import { Fade } from "react-awesome-reveal";

export default function DocumentationCreatingSkyboxPage() {
	return (
		<main className="w-full min-h-screen p-5 bg-black text-neutral-50">
			<div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
				<Fade cascade damping={0.1} triggerOnce className="w-full">
					<Fade>
						<div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">Using Fab Plugin</div>
					</Fade>
				</Fade>

				<Fade triggerOnce>
					<div className="flex flex-col gap-4">
						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Introduction</div>

						<div>
							<Link href="https://www.fab.com" target="_blank" className="underline underline-offset-4">
								Fab.com
							</Link>{" "}
							is a tool-agnostic marketplace for digital assets created by{" "}
							<Link href="https://www.epicgames.com" target="_blank" className="underline underline-offset-4">
								Epic Games
							</Link>
							. It allows creators to sell 3D models, textures, and other digital assets to a wide audience.
							<br />
							Download an asset from Fab and export it to your favorite software. The Fab plugin for Babylon.js Editor allows you to import these assets directly into
							your project.
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Prerequisite</div>

						<div>
							In order to use Fab and download/export assets, you need an active <b>Epic Games account</b> and the <b>Epic Games Launcher</b> installed on your
							computer.
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Installing the plugin</div>

						<div>
							The Babylon.js Editor Fab plugin is available as a{" "}
							<Link href="https://www.npmjs.com/package/babylonjs-editor-fab-plugin" target="_blank" className="underline underline-offset-4">
								<b>npm package</b>
							</Link>
							. To install a plugin, simply open the <b>Project Settings</b> in the Babylon.js Editor, go to the <b>Plugins</b> tab, click the <b>Add button</b> and
							select <b>From npm</b>.
						</div>

						<div>
							Then enter the name of the plugin to add. The name of the Fab plugin is <b className="underline underline-offset-4">babylonjs-editor-fab-plugin</b>.
						</div>

						<div>
							Once installed, a new tab named <b>Fab</b> will be available in the Editor's layout. This tab will show all the assets that were exported using Fab and
							can be imported into the current project.
						</div>

						<div className="mx-auto p-10 w-full object-contain">
							<video muted autoPlay loop controls className="rounded-lg">
								<source src="/documentation/plugins/fab/installing.mp4" />
							</video>
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Importing</div>

						<div>
							For now, suported asset types are:
							<ul className="list-disc">
								<li>For 3D models: GLTF, GLB, OBJ and FBX.</li>
								<li>For materials: Texture Set</li>
							</ul>
						</div>

						<div>
							To import assets from Fab, download any asset from the <b>Fab section in the Epic Games Launcher</b> by selecting the right file format before and
							select the <b>Export target</b> to be <b>Custom (socket port)</b>. Once done, simply click the <b>Export</b> button.
						</div>

						<div className="italic">
							Note: in case of a collection of multiple assets, Fab will ask you if you want to export all assets. All assets will be imported in the project's root
							folder <b>assets/fab</b> and any unused assets can be deleted later.
						</div>

						<div>
							Once exported, the Editor will perform all necessary conversions and optimizations for assets such as the merge of textures for metallic-roughness
							materials (ORM) etc. According to the size of the asset(s), this process can take a few seconds to a couple of minutes.
						</div>

						<div className="mx-auto p-10 w-full object-contain">
							<video muted autoPlay loop controls className="rounded-lg">
								<source src="/documentation/plugins/fab/importing.mp4" />
							</video>
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Instantiating</div>

						<div>
							To instantiate an imported Fab asset into the scene, simply select it from the Fab tab and drag'n'drop it into the preview panel like any other asset.
							<br />
							Because Fab assets are described by a collection of meshes and materials, the plugin will automatically assign pre-configured materials to the meshes
							when instantiating them.
						</div>

						<div>
							For a manual import, you can simply navigate to the <b>assets/fab</b> folder in the <b>Assets browser</b> panel and drag'n'drop the desired asset into
							the preview or the graph panels. Doing that allows you to use available assets such as materials separately.
						</div>

						<div className="mx-auto p-10 w-full object-contain">
							<video muted autoPlay loop controls className="rounded-lg">
								<source src="/documentation/plugins/fab/instantiating.mp4" />
							</video>
						</div>
					</div>
				</Fade>
			</div>
		</main>
	);
}

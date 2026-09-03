"use client";

import { FaArrowRight } from "react-icons/fa6";

import { CustomLink, DocPage, DocHeading, DocImage, DocVideo } from "../../components";

export default function DocumentationCreatingSkyboxPage() {
	return (
		<DocPage>
			<DocHeading level={2}>Introduction</DocHeading>

			<p>
				A simulated sky can be added to a scene using a "skybox" (<CustomLink href="https://en.wikipedia.org/wiki/Skybox_(video_games)">Wikipedia</CustomLink>). A skybox is
				a large standard cube surrounding the scene, with a sky image painted on each face. (Images are a lot easier and faster to render than 3D objects, and just as good
				for far-distant scenery.)
			</p>

			<div className="flex flex-col gap-2">
				<p>A skybox in the editor can be created using 2 different methods:</p>

				<ul className="list-disc pl-6 space-y-1">
					<li>
						Using a <b>Cube Texture</b>: create a skybox mesh and assign a cube texture to it. This method allows to use a custom texture for the skybox.
					</li>
					<li>
						Using the <b>Sky Material</b>: create a skybox mesh and assign a new Sky Material to it. Babylon.js provides a material used to render sky that is
						customizable so the sky can appear "alive".
					</li>
				</ul>
			</div>

			<DocHeading level={2}>Creating the Skybox mesh</DocHeading>

			<p>
				To create a new skybox mesh, simply use the main toolbar <b>Add {"->"} Skybox Mesh</b> or right-click the scene graph and select <b>Add {"->"} Skybox Mesh</b>.
			</p>

			<p>A Skybox mesh is a cube mesh set to have back faces visible, so it can be seen from the inside. By default, a Skybox will have no material assigned to it.</p>

			<DocVideo src="/documentation/tips/creating-skybox/create-skybox-mesh.mp4" />

			<DocHeading level={2}>Using Cube Texture</DocHeading>

			<p>
				The goal here is to create a new material that will be assigned on the newly created Skybox. Then, assign an existing Cube Texture to the material as an{" "}
				<b>Environment Texture</b>. The last step will be to edit the Cube Texture to use "Skybox" coordinates mode.
			</p>

			<DocVideo src="/documentation/tips/creating-skybox/assign-cube-texture.mp4" />

			<p>
				To save loading time and performances in the application you are building, the editor provides a way to convert <b>.hdr</b> textures to <b>.env</b> textures. The
				issue addressed with .env is the size and quality of IBL Environment Textures.
			</p>

			<p>
				More information about .env environment textures{" "}
				<CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/materials/using/HDREnvironment#what-is-a-env-tech-deep-dive">here</CustomLink>.
			</p>

			<p>
				To convert a .hdr texture to .env, just right-click the .hdr file in the <b>Assets Browser</b> panel and select <b>Convert to .env</b>. Once the Cube Texture is
				converted, it will appear as a .env file in the assets and can now be used as an Environment Texture.
			</p>

			<div className="flex items-center justify-center gap-6">
				<DocImage src="/documentation/tips/creating-skybox/convert-hdr.png" alt="Converting a .hdr file to .env" className="w-1/2" />

				<FaArrowRight className="w-16 h-16 shrink-0" />

				<DocImage src="/documentation/tips/creating-skybox/hdr-converted.png" alt="The converted .env file in the assets" className="w-1/2" />
			</div>

			<DocHeading level={2}>Using Sky Material</DocHeading>

			<p>
				The principle here is the same as the previous method, but instead of creating a new material that will receive a Cube Texture, let's just create a new{" "}
				<b>Sky Material</b>.
			</p>

			<p>Once applied, the Sky Material can be edited on the fly to change the aspect of the Skybox.</p>

			<DocVideo src="/documentation/tips/creating-skybox/create-sky-material.mp4" />
		</DocPage>
	);
}

"use client";

import Link from "next/link";

import { Fade } from "react-awesome-reveal";
import { FaArrowRight } from "react-icons/fa6";

export default function DocumentationCreatingSkyboxPage() {
	return (
		<main className="w-full min-h-screen p-5 bg-black text-neutral-50">
			<div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
				<Fade cascade damping={0.1} triggerOnce className="w-full">
					<Fade>
						<div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">Creating a Skybox</div>
					</Fade>
				</Fade>

				<Fade triggerOnce>
					<div className="flex flex-col gap-4">
						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Introduction</div>

						<div>
							A simulated sky can be added to a scene using a "skybox" (
							<Link target="_blank" href="https://en.wikipedia.org/wiki/Skybox_(video_games)" className="underline underline-offset-4">
								Wikipedia
							</Link>
							). A skybox is a large standard cube surrounding the scene, with a sky image painted on each face. (Images are a lot easier and faster to render than 3D
							objects, and just as good for far-distant scenery.)
						</div>

						<div>
							A skybox in the editor can be created using 2 different methods:
							<ul className="list-disc">
								<li>
									Using a <b>Cube Texture</b>: create a skybox mesh and assign a cube texture to it. This method allows to use a custom texture for the skybox.
								</li>
								<li>
									Using the <b>Sky Material</b>: create a skybox mesh and assign a new Sky Material to it. Babylon.js provides a material used to render sky that
									is customizable so the sky can appear "alive".
								</li>
							</ul>
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Creating the Skybox mesh</div>

						<div>
							To create a new skybox mesh, simply use the main toolbar <b>Add {"->"} Skybox Mesh</b> or right-click the scene graph and select{" "}
							<b>Add {"->"} Skybox Mesh</b>.
						</div>

						<div>
							A Skybox mesh is a cube mesh set to have back faces visible, so it can be seen from the inside. By default, a Skybox will have no material assigned to
							it.
						</div>

						<div className="mx-auto p-10 w-full object-contain">
							<video muted autoPlay loop controls className="rounded-lg">
								<source src="/documentation/tips/creating-skybox/create-skybox-mesh.mp4" />
							</video>
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Using Cube Texture</div>

						<div>
							The goal here is to create a new material that will be assigned on the newly created Skybox. Then, assign an existing Cube Texture to the material as an{" "}
							<b>Environment Texture</b>. The last step will be to edit the Cube Texture to use "Skybox" coordinates mode.
						</div>

						<div className="mx-auto p-10 w-full object-contain">
							<video muted autoPlay loop controls className="rounded-lg">
								<source src="/documentation/tips/creating-skybox/assign-cube-texture.mp4" />
							</video>
						</div>

						<div>
							To save loading time and performances in the application you are building, the editor provides a way to convert <b>.hdr</b> textures to <b>.env</b>{" "}
							textures. The issue addressed with .env is the size and quality of IBL Environment Textures.
						</div>

						<div>
							More information about .env environement textures{" "}
							<Link
								target="_blank"
								className="underline underline-offset-4"
								href="https://doc.babylonjs.com/features/featuresDeepDive/materials/using/HDREnvironment#what-is-a-env-tech-deep-dive"
							>
								here
							</Link>
							.
						</div>

						<div>
							To convert a .hdr texture to .env, just right-click the .hdr file in the <b>Assets Browser</b> panel and select "<b>Convert to .env</b>". Once the Cube
							Texture is converted, it will appear as a .env file in the assets and can now be used as an Environment Texture.
						</div>

						<div className="flex gap-10 items-center">
							<div className="mx-auto p-10 w-full object-contain">
								<img src="/documentation/tips/creating-skybox/convert-hdr.png" className="rounded-lg" />
							</div>

							<FaArrowRight className="w-32 h-32" />

							<div className="mx-auto p-10 w-full object-contain">
								<img src="/documentation/tips/creating-skybox/hdr-converted.png" className="rounded-lg" />
							</div>
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Using Sky Material</div>

						<div>
							The principle here is the same as the previous method, but instead of creating a new material that will receive a Cube Texture, let's just create a new{" "}
							<b>Sky Material</b>.
						</div>

						<div>Once applied, the Sky Material can be edited on the fly to change the aspect of the Skybox.</div>

						<div className="mx-auto p-10 w-full object-contain">
							<video muted autoPlay loop controls className="rounded-lg">
								<source src="/documentation/tips/creating-skybox/create-sky-material.mp4" />
							</video>
						</div>
					</div>
				</Fade>
			</div>
		</main>
	);
}

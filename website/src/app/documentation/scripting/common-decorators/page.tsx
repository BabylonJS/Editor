"use client";

import { Fade } from "react-awesome-reveal";

import { CodeBlock } from "../../code";

import { animationGroupFromScene, componentFromScene, nodeFromDescendants, nodeFromScene, sceneAsset } from "./decorators";
import { CustomLink } from "../../link";

export default function DocumentationCommonDecoratorsPage() {
	return (
		<main className="w-full min-h-screen p-5 bg-black text-neutral-50">
			<div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
				<Fade cascade damping={0.1} triggerOnce className="w-full">
					<Fade>
						<div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">Common decorators</div>
					</Fade>
				</Fade>

				<Fade triggerOnce>
					<div className="flex flex-col gap-4">
						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Introduction</div>

						<div>
							Scripts can retrieve instances from the scene by using some common decorators. Those decorators are used to retrieve objects from the scene and link
							them to properties in the script. This way, you can easily reference other objects in the scene and use them in your script.
						</div>

						{/* Node from scene */}
						<div className="text-3xl md:text-2xl lg:text-3xl my-3">@nodeFromScene</div>

						<div>
							This decorator is used to retrieve any <b>Mesh</b>, <b>TransformNode</b>, <b>Light</b> or <b>Camera</b> from the scene by its name. The retrieved node
							is linked to the decorated property, so you can use it in your script.
						</div>

						<CodeBlock code={nodeFromScene} />

						{/* Node from descendants */}
						<div className="text-3xl md:text-2xl lg:text-3xl my-3">@nodeFromDescendants</div>

						<div>
							This decorator is used to retrieve any <b>Mesh</b>, <b>TransformNode</b>, <b>Light</b> or <b>Camera</b> from the <b>children</b> of the object the
							script is attached to. The retrieved node is linked to the decorated property, so you can use it in your script.
						</div>

						<CodeBlock code={nodeFromDescendants} />

						{/* Animation group */}
						<div className="text-3xl md:text-2xl lg:text-3xl my-3">@animationGroupFromScene</div>

						<div>
							This decorator is used to retrieve any <b>Animation Group</b> from the scene. The retrieved animation group is linked to the decorated property, so you
							can use it in your script.
						</div>

						<CodeBlock code={animationGroupFromScene} />

						{/* Scene asset */}
						<div className="text-3xl md:text-2xl lg:text-3xl my-3">@sceneAsset</div>

						<div>This decorator is used to load and retrieve a scene container.</div>

						<div>
							A scene can be used for multiple reasons. For example, a scene that is used once like a map, or a scene that is set to be instantiated multiple times
							like an enemies. In the first case, you can load the scene and retrieve the container with the decorator, while in the second case, you can load the
							scene as a container and instantiate it multiple times in the main scene.
						</div>

						<div>
							The retrieved scene container instance is of type <b>AdvancedAssetContainer</b>, which is an extended version of the <b>AssetContainer</b> class
							provided by Babylon.js.
						</div>

						<div>
							A scene container can be used to instantiate the assets multiple time. The goal of the <b>AdvancedAssetContainer</b> is to add support of extra features
							to the default <b>AssetContainer</b>, like the possibility instantiate attached scripts to instantiated entries.
						</div>

						<div className="flex flex-col gap-2">
							Available methods are:
							<ul className="list-disc ml-5 space-y-2">
								<li>
									<b>removeDefault</b>: When a scene is loaded as a container, it is automatically instantiated once and the instances are added to the main
									scene. This method allows to remove those default instances from the main scene as the container is used to be instantiated on-demand, for
									example for enemies.
								</li>
								<li>
									<b>instantiate</b>: Instantiates the whole container and returns the root nodes of the instantiated hierarchy. More information about
									instantiated entries in{" "}
									<CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/importers/assetContainers#duplicating-the-models">
										Babylon.js Documentation (Duplicating the models)
									</CustomLink>
								</li>
							</ul>
						</div>

						<CodeBlock code={sceneAsset} />

						{/* Component from scene */}
						<div className="text-3xl md:text-2xl lg:text-3xl my-3">@componentFromScene</div>

						<div>
							This decorator is used to retrieve the unique reference to a script attached to an object that has been instantiated in the scene. The retrieved script
							reference is linked to the decorated property, so you can use it in your script.
						</div>

						<div>
							When using this decorator, make sure that only one instance of the script you want to retrieve is attached to objects in the scene. If multiple
							instances of the same script are found in the scene, an error will be thrown and the project won't be able to run, since it won't know which one to link
							to.
						</div>

						<CodeBlock code={componentFromScene} />
					</div>
				</Fade>
			</div>
		</main>
	);
}

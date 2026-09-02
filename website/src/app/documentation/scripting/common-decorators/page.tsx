"use client";

import { DocPage, DocHeading, CodeBlock, Callout, CustomLink } from "../../components";
import { animationGroupFromScene, componentFromScene, nodeFromDescendants, nodeFromScene, sceneAsset } from "./decorators";

export default function DocumentationCommonDecoratorsPage() {
	return (
		<DocPage>
			<DocHeading level={2}>Introduction</DocHeading>

			<p>
				Scripts can retrieve instances from the scene by using common decorators. Those decorators link scene objects directly to properties in your script, making it
				simple to reference meshes, lights, cameras, or other components without manual searching.
			</p>

			<DocHeading level={2}>@nodeFromScene</DocHeading>

			<p>
				Retrieves any <b>Mesh</b>, <b>TransformNode</b>, <b>Light</b>, or <b>Camera</b> from the scene by its name. The retrieved node is linked directly to the decorated
				property.
			</p>

			<CodeBlock code={nodeFromScene} filename="scripts/myScript.ts" />

			<DocHeading level={2}>@nodeFromDescendants</DocHeading>

			<p>
				Retrieves any <b>Mesh</b>, <b>TransformNode</b>, <b>Light</b>, or <b>Camera</b> from the <b>children</b> of the object the script is attached to.
			</p>

			<CodeBlock code={nodeFromDescendants} filename="scripts/myScript.ts" />

			<DocHeading level={2}>@animationGroupFromScene</DocHeading>

			<p>
				Retrieves any <b>Animation Group</b> from the scene by name.
			</p>

			<CodeBlock code={animationGroupFromScene} filename="scripts/myScript.ts" />

			<DocHeading level={2}>@sceneAsset</DocHeading>

			<p>Loads and retrieves a scene container. This is useful for reusable assets like maps or enemies that need to be instantiated multiple times on demand.</p>

			<p>
				The retrieved instance is of type <b>AdvancedAssetContainer</b>, which extends the Babylon.js <b>AssetContainer</b> class to support attaching scripts to
				instantiated entries.
			</p>

			<div className="flex flex-col gap-2">
				<p className="font-semibold">Available methods:</p>
				<ul className="list-disc pl-6 space-y-2">
					<li>
						<b>removeDefault</b>: When a scene container is loaded, it is automatically instantiated once. Calling this removes those default instances from the scene
						so you can instantiate them strictly on demand.
					</li>
					<li>
						<b>instantiate</b>: Instantiates the container and returns the root nodes. Learn more in the{" "}
						<CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/importers/assetContainers#duplicating-the-models">
							Babylon.js Documentation (Duplicating the models)
						</CustomLink>
						.
					</li>
				</ul>
			</div>

			<CodeBlock code={sceneAsset} filename="scripts/myScript.ts" />

			<DocHeading level={2}>@componentFromScene</DocHeading>

			<p>Retrieves the unique reference to a script attached to an object in the scene.</p>

			<Callout type="warning" title="Unique Instances Required">
				Make sure that only one instance of the target script is attached in the scene. If multiple instances are found, an error is thrown because the editor cannot
				determine which instance to link.
			</Callout>

			<CodeBlock code={componentFromScene} filename="scripts/myScript.ts" />
		</DocPage>
	);
}

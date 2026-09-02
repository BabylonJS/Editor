"use client";

import { Callout, CustomLink, DocPage, DocHeading, DocImage, DocVideo } from "../../components";

export default function DocumentationManagingAssetsPage() {
	return (
		<DocPage>
			<DocHeading level={2}>Introduction</DocHeading>

			<p>
				This chapter is linked to the previous one (<b>Composing scene</b>) but goes deeper into the management of assets. How to create your own materials, how to assign
				textures to materials, etc.
			</p>

			<Callout type="warning" title="Assets folder">
				All the assets used in your project must be located at least in the <b>/assets</b> folder in order to be correctly understood by the editor. This <b>assets</b>{" "}
				folder is the root folder of all the assets used in your project and is also located in the root folder of your project.
			</Callout>

			<DocHeading level={2}>Creating your own materials</DocHeading>

			<p>
				When importing a 3D model, most of the time it comes with its own materials and textures already configured. But sometimes you may want to have a deeper control
				over the materials and see how its related assets (typically textures) appear using the Babylon.js engine.
			</p>

			<p>Let's start with an empty box that we created using the primitive objects of the editor. By default the box has no material assigned to it.</p>

			<DocImage src="/documentation/basics/managing-assets/empty-box.png" alt="An empty box with no material assigned" />

			<p>
				To create a new material, go in the <b>assets</b> folder in the <b>Assets Browser</b> panel and right click in order to show the context menu and select <b>Add</b>.
			</p>

			<p>
				The editor supports both <b>PBR</b> and <b>Standard</b> materials. Most of the time, it is recommended to add PBR materials as it became the norm today. For more
				information about PBR materials, you can refer to this{" "}
				<b>
					<CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/materials/using/introToPBR">excellent documentation</CustomLink>
				</b>{" "}
				of Babylon.js.
			</p>

			<p>
				Once you clicked on <b>Add {"->"} PBR Material</b>, a new asset file appears named <b>New PBR Material.material</b>. Double-click on its name and rename it to{" "}
				<b>my-material.material</b> or any other name you prefer. Always keeping a constant and logical naming of assets is important to keep your assets organized.
			</p>

			<DocVideo src="/documentation/basics/managing-assets/creating-pbr-material.mp4" />

			<p>
				New created materials are empty by default. Now, to assign this material to the box or any other asset, you can drag and drop the material file on the desired mesh
				in the <b>Preview</b> panel.
			</p>

			<Callout type="warning" title="Shared materials">
				Materials that are created manually are shared across all objects it is applied to. For example, if the material is assigned to 2 distinct meshes and the material
				properties are edited, both meshes will be updated.
			</Callout>

			<DocVideo src="/documentation/basics/managing-assets/assigning-material.mp4" />

			<p>
				Your own material is now applied on the box! Now the goal is to edit the material properties using the <b>Inspector</b> panel. To do so, just click on the box in
				the <b>Preview</b> panel in order to edit the object.
				<br />
				Scroll a bit in the <b>Inspector</b> panel in order to see the <b>Material</b> section. Starting from here you can edit the material properties.
			</p>

			<DocHeading level={2}>Assigning textures to materials</DocHeading>

			<p>
				Because newly created materials are empty, you may want to assign textures to them. As for 3D models, textures are assets that can be imported in the <b>assets</b>{" "}
				folder in the <b>Assets Browser</b> panel.
				<br />
				Let's create a <b>pbr</b> folder in the <b>assets</b> folder using the <b>Assets Browser</b> panel and import textures in it.
			</p>

			<DocVideo src="/documentation/basics/managing-assets/importing-textures.mp4" />

			<div className="flex flex-col gap-2">
				<p>Here, 3 textures were imported:</p>

				<ul className="list-disc pl-6 space-y-1">
					<li>
						<b>Albedo texture</b>: the base color of the object.
					</li>
					<li>
						<b>Normal texture</b>: to simulate bump and dents on the object's surface. More information about bump mapping{" "}
						<b>
							<CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/materials/using/moreMaterials#bump-map">here</CustomLink>
						</b>
						.
					</li>
					<li>
						<b>Metallic texture</b>: texture containing both the metallic value in the B channel and the roughness value in the G channel to keep better precision.
						Ambient occlusion can also be saved in R channel.
					</li>
				</ul>
			</div>

			<p>
				To master the meaning of those textures, refer to the{" "}
				<b>
					<CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/materials/using/introToPBR">Babylon.js documentation</CustomLink>
				</b>
				.
			</p>

			<p>
				In the <b>Inspector</b> panel, all the available slots for textures are shown in the <b>Material Textures</b> section. To assign a texture, just drag'n'drop the
				texture file from the <b>Assets Browser</b> panel to the slot in the inspector.
			</p>

			<p>Once a texture is assigned, the slot is updated to show the preview of the texture and its potential properties to edit.</p>

			<DocVideo src="/documentation/basics/managing-assets/assigning-textures.mp4" />

			<p>
				As an advanced user, you may want to edit the properties of a texture in a material, just click on the preview of the texture in the <b>Inspector</b> panel.
				<br />A new panel appears showing all the properties of the texture. Here you can edit the properties of the texture to fit your needs.
			</p>

			<DocVideo src="/documentation/basics/managing-assets/editing-texture.mp4" />

			<Callout type="tip" title="Shortcut">
				You can also drag'n'drop a texture file directly on a mesh in the <b>Preview</b> panel. The editor will ask for the slot where to assign the texture.
			</Callout>

			<DocVideo src="/documentation/basics/managing-assets/assigning-texture-preview.mp4" />
		</DocPage>
	);
}

"use client";

import { CodeBlock, CustomLink, DocHeading, DocPage } from "../../components";
import { loadSceneWithGaussianSplatting } from "./scripts";

export default function DocumentationUsingGaussianSplattingPage() {
	return (
		<DocPage>
			<DocHeading level={2}>Introduction</DocHeading>

			<p>
				Gaussian Splatting is a volume-rendering method. It's useful for capturing real-life data. You can find more information about Gaussian Splatting support in
				Babylon.js <CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/mesh/gaussianSplatting">here</CustomLink>.
			</p>

			<DocHeading level={2}>Importing Gaussian Splatting assets</DocHeading>

			<p>
				The Babylon.js Editor supports Gaussian Splatting assets. You can import them in your project and use them in your scene. The Editor will automatically create a
				Gaussian Splatting instance. You can then manipulate them in the scene and change their properties in the Inspector. You can also add scripts to them.
			</p>

			<div className="flex flex-col gap-2">
				<p>Supported formats are:</p>
				<ul className="list-disc pl-6 space-y-1">
					<li>
						<b>.splat</b>: JavaScript typed-array serialized version of .PLY data
					</li>
					<li>
						<b>.spz</b>: <CustomLink href="https://scaniverse.com/news/spz-gaussian-splat-open-source-file-format">Niantic Labs</CustomLink> SPZ format{" "}
					</li>
					<li>
						<b>.sog</b>: <CustomLink href="https://github.com/fraunhoferhhi/Self-Organizing-Gaussians">Self-Organizing Gaussian</CustomLink> format
					</li>
				</ul>
			</div>

			<DocHeading level={2}>Supporting Gaussian Splatting in your app</DocHeading>

			<p>
				By default, Gaussian Splatting support is <b>NOT</b> included when you import the Babylon.js Editor tools. For tree-shaking purposes, you need to explicitly import
				the Gaussian Splatting support in your app. You can do this by adding the following line in your code:
			</p>

			<CodeBlock code={`import "babylonjs-editor-tools/loading/gaussian-splatting";`} />

			<p>
				And then you can load your scene(s) that contain Gaussian Splatting assets. The loader will automatically create the Gaussian Splatting instances in your scene.
				Here is an example of the code to load a scene with Gaussian Splatting support:
			</p>

			<CodeBlock code={loadSceneWithGaussianSplatting} />
		</DocPage>
	);
}

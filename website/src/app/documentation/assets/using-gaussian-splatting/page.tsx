"use client";

import Link from "next/link";

import { Fade } from "react-awesome-reveal";

import { CodeBlock } from "../../code";
import { loadSceneWithGaussianSplatting } from "./scripts";

export default function DocumentationRunningProjectPage() {
	return (
		<main className="w-full min-h-screen p-5 bg-black text-neutral-50">
			<div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
				<Fade cascade damping={0.1} triggerOnce className="w-full">
					<Fade>
						<div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">Using Sprite Manager</div>
					</Fade>
				</Fade>

				<Fade triggerOnce>
					<div className="flex flex-col gap-4">
						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Introduction</div>

						<div>
							Gaussian Splatting is a volume-rendering method. It's useful for capturing real-life data. You can find more information about Gaussian Splatting
							support in Babylon.js{" "}
							<Link href="https://doc.babylonjs.com/features/featuresDeepDive/mesh/gaussianSplatting" target="_blank" className="underline underline-offset-4">
								here
							</Link>
							.
						</div>

						<div>
							The Babylon.js Editor supports Gaussian Splatting assets. You can import them in your project and use them in your scene. The Editor will automatically
							create a Gaussian Splatting instance. You can then manipulate them in the scene and change their properties in the Inspector. You can also add scripts
							to them.
						</div>

						<div>
							Supported formats are:
							<ul className="list-disc list-inside">
								<li>
									<b>.splat</b>: JavaScript typed-array serialized version of .PLY data
								</li>
								<li>
									<b>.spz</b>:{" "}
									<Link href="https://scaniverse.com/news/spz-gaussian-splat-open-source-file-format" target="_blank" className="underline underline-offset-4">
										Niantic Labs
									</Link>{" "}
									SPZ format{" "}
								</li>
								<li>
									<b>.sog</b>:{" "}
									<Link href="https://github.com/fraunhoferhhi/Self-Organizing-Gaussians" target="_blank" className="underline underline-offset-4">
										Self-Organizing Gaussian
									</Link>{" "}
									format
								</li>
							</ul>
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Importing Gaussian Splatting assets</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Supporting Gaussian Splatting in your app</div>

						<div>
							By default, Gaussian Splatting support is <b>NOT</b> included when you import the Babylon.js Editor tools. For tree-shaking purpose, you need to
							explicitely import the Gaussian Splatting support in your app. You can do this by adding the following line in your code:
						</div>

						<CodeBlock code={`import "babylonjs-editor-tools/loading/gaussian-splatting";`} />

						<div>
							And then you can load your scene(s) that contain Gaussian Splatting assets. The loader will automatically create the Gaussian Splatting instances in
							your scene. Here is an example of the code to load a scene with Gaussian Splatting support:
						</div>

						<CodeBlock code={loadSceneWithGaussianSplatting} />
					</div>
				</Fade>
			</div>
		</main>
	);
}

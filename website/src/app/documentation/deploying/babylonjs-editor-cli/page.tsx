"use client";

import Link from "next/link";

import { Fade } from "react-awesome-reveal";

import { CodeBlock } from "../../code";

import { ciExample, installing, pack, packageJson } from "./scripts";

export default function UsingBabylonJSEditorCLIPage() {
	return (
		<main className="w-full min-h-screen p-5 bg-black text-neutral-50">
			<div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
				<Fade cascade damping={0.1} triggerOnce className="w-full">
					<Fade>
						<div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">Using Babylon.js Editor CLI</div>
					</Fade>
				</Fade>

				<Fade triggerOnce>
					<div className="flex flex-col gap-4">
						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Introduction</div>

						<div>
							The Babylon.js Editor provides a package named <b>babylonjs-editor-cli</b> that can be installed as a dependency of a project. This package provides a
							command line interface (CLI) to generate all necessary assets and files in the <b>public/scene</b> folder without having to open the editor application.
							<br />
							In other words, it allows you to generate all necessary assets in your own <b>CI/CD pipeline</b>.
						</div>

						<div>
							The package is available on NPM{" "}
							<Link href="https://www.npmjs.com/package/babylonjs-editor-cli" target="_blank" className="underline underline-offset-4">
								here
							</Link>
							.
						</div>

						<div>
							The goal of this CLI is to:
							<ul className="list-disc">
								<li>generate all .babylon scenes.</li>
								<li>generate all necessary assets including down-scaled and compressed textures.</li>
								<li>collect all scripts attached to entities in order to bundle them properly.</li>
							</ul>
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Installing babylonjs-editor-cli</div>

						<div>
							Starting from Babylon.js Editor <b>v5.3.0</b>, the babylonjs-editor-cli package is included as a dependency of newly generated projects. Therefore, if
							you have created your project with a previous version of the editor, you will need to install it manually:
						</div>

						<CodeBlock language="bash" code={installing} />

						<div>
							Then, in your <b>package.json</b>, you can add a script to easily run the CLI:
						</div>

						<CodeBlock language="bash" code={packageJson} />

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Packing project</div>

						<div>
							The babylonjs-editor-cli package provides a command named <b>pack</b> that will generate all necessary assets and files in the <b>public/scene</b>{" "}
							folder of your project.
							<br />
							To run the command, simply use:
						</div>

						<CodeBlock language="bash" code={pack} />

						<div>A cache is automatically saved locally in order to speed up the packing process on subsequent runs.</div>

						<div className="mx-auto p-10 w-full object-contain">
							<video muted autoPlay loop controls className="rounded-lg">
								<source src="/documentation/deploying/babylonjs-editor-cli/running.mp4" />
							</video>
						</div>

						<div>
							The pack command will also collect all scripts attached to entities in order to bundle them properly.
							<br />
							It is <b>IMPORTANT</b> to pack the project before building it so that all scripts (<i>located at src/scripts.ts</i>) are properly bundled.
						</div>

						<div>Here is a simple example on how the CI/CD pipeline could look like:</div>

						<CodeBlock language="bash" code={ciExample} />
					</div>
				</Fade>
			</div>
		</main>
	);
}

"use client";

import { Fade } from "react-awesome-reveal";
import { IoIosWarning } from "react-icons/io";

import { CodeBlock } from "../../code";
import { CustomLink } from "../../link";

import { cliPack, enableKtx2 } from "./scripts";

export default function DocumentationCompressingTexturesPage() {
	return (
		<main className="w-full min-h-screen p-5 bg-black text-neutral-50">
			<div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
				<Fade cascade damping={0.1} triggerOnce className="w-full">
					<Fade>
						<div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">Compressing textures</div>
					</Fade>
				</Fade>

				<Fade triggerOnce>
					<div className="flex flex-col gap-4">
						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Introduction</div>

						<div>
							Compressed textures are used to reduce the size in video memory without sacrificing quality. Compressing textures can be done automatically when
							exporting the project but can require time to compute depending on the number of textures and their size.
						</div>

						<div>
							Compressed textures are not necessary less heavy in terms of file size but are optimized for GPU usage. Therefore, they can significantly reduce the{" "}
							<b>memory usage</b> and also increase the performance of your game in terms of rendering speed by reducing the internal bandwidth transfers.
						</div>

						<div>
							To compress textures using Babylon.js Editor, 2 methods are available:
							<ul className="list-disc list-inside mt-2">
								<li>
									<b>PVRTexTool</b>: A command-line tool provided by{" "}
									<CustomLink href="https://developer.imaginationtech.com/solutions/pvrtextool/">Imagination Technologies</CustomLink> used to generate one{" "}
									<b>.ktx</b> texture file per format (ASCT, DXT, ETC1, ETC2 and PVRTC).
								</li>
								<li>
									<b>KTX-Software</b>: An open-source texture compression CLI provided by the{" "}
									<CustomLink href="https://www.khronos.org/ktx/">Khronos Group</CustomLink> that supports <b>KTX 2.0</b> container. Compared to PVRTexTool which
									generates one KTX file per format, KTX-Software is capable of creating a unique KTX 2.0 file per texture that is supported on all platforms
									which makes the compression process much faster and less storage consuming.
								</li>
							</ul>
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Installing KTX-Software</div>

						<div>
							KTX-Software can be downloaded from <CustomLink href="https://github.com/KhronosGroup/KTX-Software/releases">their release page on Github</CustomLink>.
							Only versions 4.x are supported. Download the appropriate package according to your current operating system (Windows, Linux or MacOS) and install it on
							your machine.
						</div>

						<div className="flex gap-2 items-center">
							<IoIosWarning size="32px" color="orange" />
							<div>
								The KTX-Software installer may ask to install the command in <b>PATH</b>. This option must be enabled so the Babylon.js Editor can use the command.
							</div>
						</div>

						<div>Once installed, a new command is available on your system. To verify and try it, open a terminal and type the following command:</div>

						<CodeBlock language="bash" code="ktx --help" />

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Enabling KTX-Software in your project</div>

						<div>
							Compressing textures in the Babylon.js Editor can be enabled by opening the project's configuration. To acess the project's settings, simply use the
							main toolbar <b>Edit {"->"} Project</b>. In the <b>Editor</b> tab of the project's settings and under the "<b>Textures</b>" section, 3 options are
							available for compressing textures:
						</div>

						<div className="text-xl md:text-lg lg:text-xl my-3 text-muted-foreground">Enabled</div>

						<div>
							Sets wether or not compressing textures is enabled when exporting the project. By default, this option is not enabled. When using Babylon.js Editor CLI,
							this option will also be used to determine if textures should be compressed during the generation process.
						</div>

						<div className="text-xl md:text-lg lg:text-xl my-3 text-muted-foreground">Enabled in preview</div>

						<div>
							Sets wether or not textures used in the editor are also compressed. By default, this option is disabled. Using KTX allows to load textures faster.
							Enabling this feature will make the used textures in each scene being compressed and stored in the temporary directory <b>.bjseditor</b> available in
							the root folder of the project and scenes will load way faster than using original .png, .jpg, etc. textures.
						</div>

						<div>
							Compressing temporary textures for the editor is done on the fly and will not affect the original texture files. To not overload the editor's process on
							your computer, textures are compressed <b>one by one</b> (not parallelized) and quality is set to <b>Very fast</b>.
						</div>

						<div className="text-xl md:text-lg lg:text-xl my-3 text-muted-foreground">Quality</div>

						<div>
							The quality of the compression can be set to either <b>Very fast</b>, <b>Fast</b>, <b>Normal</b> or <b>High</b>. The higher the quality, the longer the
							compression process will take but the better the result will be. By default, the quality is set to <b>Very fast</b>.
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Using Babylon.js Editor CLI</div>

						<div>
							When packing the assets of your project using the Babylon.js Editor CLI, textures will be automatically compressed if the option is enabled in the
							project configuration. If not, only the original textures (.png, .jpg, etc.) will be packed without compression.
						</div>

						<CodeBlock language="bash" code={cliPack} />

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Enabling KTX2 in your game</div>

						<div>
							In your project, scenes are being loaded using the <b>loadScene</b> method from the <b>babylonjs-editor-tools</b> package. It is important to notify the
							package that KTX2 compressed textures should be used when loading the scene. To do so, simply call the following method before loading the scene:
						</div>

						<CodeBlock language="typescript" code={enableKtx2} />
					</div>
				</Fade>
			</div>
		</main>
	);
}

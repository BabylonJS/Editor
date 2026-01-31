"use client";

import { Fade } from "react-awesome-reveal";
import { IoIosWarning } from "react-icons/io";
import { IoPlay, IoRefresh, IoStop } from "react-icons/io5";

export default function DocumentationRunningProjectPage() {
	return (
		<main className="w-full min-h-screen p-5 bg-black text-neutral-50">
			<div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
				<Fade cascade damping={0.1} triggerOnce className="w-full">
					<Fade>
						<div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">Running project</div>
					</Fade>
				</Fade>

				<Fade triggerOnce>
					<div className="flex flex-col gap-4">
						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Introduction</div>

						<div>
							Projects can be played directly from the editor. A project can be composed of multiple scenes and some scripts may be attached to objects in the
							scene(s).
							<br />
							Here are 2 options:
							<ul className="list-disc">
								<li>
									<b>play the current scene</b>: all the scripts are compiled on the fly and executed in the current scene that is displayed in the editor,
									sharing the same resources (textures, etc.). This is the default behavior of the editor.
								</li>
								<li>
									<b>play the project as-is</b>: consists on running the command <b>dev</b> using the project's selected package manager (npm, yarn, bun or pnpm).
								</li>
							</ul>
						</div>

						{/* <div className="flex gap-2 items-center">
							<IoIosWarning size="32px" />

							<div className="italic">
								Only the current scene being edited in the editor will be executed and all the scripts that are attached to the objects will be executed.
							</div>
						</div> */}

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Playing the current scene</div>

						<div>
							To start the current scene, just click the start button
							<div className="inline-block px-2">
								<IoPlay className="w-6 h-6" strokeWidth={1} color="green" />
							</div>
							located in the toolbar of the editor's preview panel.
						</div>

						<div>
							Each time the current scene is played, the editor will update the assets located in the <b>public</b> folder of the project. If new assets were added to
							the project (especially images), this can take few seconds too to generate all new necessary files before the project can be played.
						</div>

						<div>
							Note that when playing, all the scripts are watched for changes and will be reloaded automatically when modified until the "play" mode is stopped.
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Stopping the current scene</div>

						<div>
							To stop the current scene being played and get back to the edit mode, just click the stop button
							<div className="inline-block px-2">
								<IoStop className="w-6 h-6" strokeWidth={1} color="red" />
							</div>
							located in the toolbar of the editor's preview panel.
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Refreshing the current scene</div>

						<div>
							Sometimes, it's useful to refresh the scene that is being played instead of stopping it and starting it again. This allows to bypass the export process
							or the editor. Just click the refresh button
							<div className="inline-block px-2">
								<IoRefresh className="w-6 h-6" strokeWidth={1} />
							</div>
							located in the toolbar of the editor's preview panel.
						</div>

						<div className="mx-auto p-10 w-full object-contain">
							<video muted autoPlay loop controls className="rounded-lg">
								<source src="/documentation/basics/running-project/running-project.mp4" />
							</video>
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Playing as-is</div>

						<div>
							To play the project as-is, simply select <b>"Run Project..."</b> in the main toolbar of the editor.
							<br />
							On macOS, use the toolbar of the app.
						</div>

						<div>
							By default, projects are based on <b>Next.JS</b> and the <b>dev</b> command will start a new server. When playing as-is and once the server is ready the
							editor will open the default browser to display the game / application.
						</div>

						<div className="flex gap-2 items-center">
							<IoIosWarning size="32px" color="orange" />

							<div className="italic">
								In case of a first launch, the process can take a few seconds to start the server until the the project is displayed in the panel.
							</div>
						</div>

						<div className="mx-auto p-10 w-full object-contain">
							<img src="/documentation/running-project/running-as-is.png" className="rounded-lg" />
						</div>
					</div>
				</Fade>
			</div>
		</main>
	);
}

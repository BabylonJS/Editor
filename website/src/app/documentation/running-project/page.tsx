"use client";

import Link from "next/link";

import { Fade } from "react-awesome-reveal";
import { IoIosWarning } from "react-icons/io";
import { IoPlay, IoRefresh, IoStop } from "react-icons/io5";

import { NextChapterComponent } from "../components/next-chapter";

export default function DocumentationRunningProjectPage() {
	return (
		<main className="w-full min-h-screen p-5 bg-black text-neutral-50">
			<div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
				<Fade cascade damping={0.1} triggerOnce className="w-full">
					<Fade>
						<div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">
							Running project
						</div>
					</Fade>
				</Fade>

				<Fade triggerOnce>
					<div className="flex flex-col gap-4">
						<div className="text-3xl md:text-2xl lg:text-3xl my-3">
							Introduction
						</div>

						<div>
							Projects can be started directly from the editor. The launch process consists on running the command <b>dev</b> using
							the project's selected package manager (npm, yarn, bun or pnpm).
						</div>

						<div>
							By default, projects are based on <b>Next.JS</b> and the <b>dev</b> command will start a new server that the editor will
							reach to display the project in the preview panel using an <b>iFrame</b>.
						</div>

						<div>
							In other words, the editor will run the project in development mode and display it in the preview panel.
						</div>

						<div className="flex gap-2 items-center">
							<IoIosWarning size="32px" />

							<div className="italic">
								Only the current scene being edited in the editor will be executed and all the scripts that are attached to the objects will be executed.
							</div>
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">
							Starting project
						</div>

						<div>
							To start the project, just click the start button
							<div className="inline-block px-2">
								<IoPlay className="w-6 h-6" strokeWidth={1} color="green" />
							</div>
							located in the toolbar of the editor's preview panel.
						</div>

						<div>
							In case of a first launch, the process can take a few seconds to start the server until the the project is displayed in the panel.
						</div>

						<div>
							Each time the project is played, the editor will update the assets located in the <b>public</b> folder of the project.
							If new assets were added to the project (especially images), this can take few seconds too to generate all new necessary files
							before the project can be played.
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">
							Stopping project
						</div>

						<div>
							To stop the project and get back to the edit mode, just click the stop button
							<div className="inline-block px-2">
								<IoStop className="w-6 h-6" strokeWidth={1} color="red" />
							</div>
							located in the toolbar of the editor's preview panel.
						</div>

						<div>
							Note that when stopping the project, the server is still running in background to avoid the next launch to take time to start.
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">
							Refreshing project
						</div>

						<div>
							Sometimes, it's useful to refresh the project that is running instead of stopping it and starting it again.
							This allows to bypass the export process or the editor. Just click the refresh button
							<div className="inline-block px-2">
								<IoRefresh className="w-6 h-6" strokeWidth={1} />
							</div>
							located in the toolbar of the editor's preview panel.
						</div>

						<div className="mx-auto p-10 w-full object-contain">
							<video muted autoPlay loop controls className="rounded-lg">
								<source src="/documentation/running-project/running-project.mp4" />
							</video>
						</div>

						<NextChapterComponent href="/documentation/customizing-scripts" title="Customizing scripts" />
					</div>
				</Fade>
			</div>
		</main>
	);
}

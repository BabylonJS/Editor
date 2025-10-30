"use client";

import Link from "next/link";

import { Fade } from "react-awesome-reveal";

import { Kbd } from "@/components/ui/kbd";

import { NextChapterComponent } from "./components/next-chapter";

export default function DocumentationPage() {
	return (
		<main className="w-full min-h-screen p-5 bg-black text-neutral-50">
			<div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
				<Fade cascade damping={0.1} triggerOnce className="w-full">
					<Fade>
						<div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">Babylon.js Editor documentation</div>
					</Fade>
				</Fade>

				<Fade triggerOnce>
					<div className="flex flex-col gap-4">
						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Introduction</div>

						<div>
							Babylon.js Editor is a visual editor for Babylon.js. It allows you to create and edit scenes, materials, attach scripts and more.
							<br />
							The Babylon.js Editor is available on <b>Window</b>, <b>macOS</b>, and <b>Linux</b> platforms.
						</div>

						<div>
							The goal is to provide a simple and easy-to-use interface for creating and editing Babylon.js applications such as video games. It includes a large
							variety of optimization tools, such as compressed textures generation, LOD collisions and more.
						</div>

						<div>
							The Babylon.js Editor is free and open-source. You can find the source code on{" "}
							<b>
								<Link target="_blank" href="https://github.com/BabylonJS/Editor" className="underline underline-offset-4">
									GitHub
								</Link>
							</b>
							.
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Prerequisite</div>

						<div>
							<b>
								<Link target="_blank" href="https://nodejs.org" className="underline underline-offset-4">
									Node.JS
								</Link>
							</b>{" "}
							must be installed on your computer. It is recommanded to have LTS version installed <b>{">="} 20</b>
						</div>

						<div>
							By default, projects are based on <b>Next.JS</b>. It is highly recommanded to have a basic understanding of{" "}
							<b>
								<Link target="_blank" href="https://react.dev/" className="underline underline-offset-4">
									React
								</Link>
							</b>{" "}
							and{" "}
							<b>
								<Link target="_blank" href="https://nextjs.org" className="underline underline-offset-4">
									Next.JS
								</Link>
							</b>{" "}
							before starting.
						</div>

						<div>
							Of course, a basic understanding of the{" "}
							<b>
								<Link target="_blank" href="https://babylonjs.com/" className="underline underline-offset-4">
									Babylon.js
								</Link>
							</b>{" "}
							engine. The most powerful, beautiful, simple, and open web rendering engine in the world.
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl mt-3">Shortcults</div>

						<div className="text-xl font-semibold">In Editor</div>

						<div className="flex flex-col">
							<div>
								<Kbd>⌘Q</Kbd> or <Kbd>CTRL+Q</Kbd>: Quit application.
							</div>
							<div>
								<Kbd>⌘,</Kbd> (macOS only): Open editor's preferences.
							</div>

							<br />

							<div>
								<Kbd>⌘C</Kbd> or <Kbd>CTRL+C</Kbd>: Copy selected text / selected object.
							</div>
							<div>
								<Kbd>⌘V</Kbd> or <Kbd>CTRL+V</Kbd>: Paste text / copied object.
							</div>

							<br />

							<div>
								<Kbd>⌘S</Kbd> or <Kbd>CTRL+S</Kbd>: Save project.
							</div>
							<div>
								<Kbd>⌘G</Kbd> or <Kbd>CTRL+G</Kbd>: Generate project output (downsized & compressed textures, scripts map, output scene, assets copy, etc.).
							</div>
							<div>
								<Kbd>⌘P</Kbd> or <Kbd>CTRL+P</Kbd>: Open commands dialog.
							</div>
							<div>
								<Kbd>⌘F</Kbd> or <Kbd>CTRL+F</Kbd>: Focus selected object in preview panel.
							</div>

							<br />

							<div>
								<Kbd>⌘T</Kbd> or <Kbd>CTRL+T</Kbd>: Select translation gizmo.
							</div>
							<div>
								<Kbd>⌘R</Kbd> or <Kbd>CTRL+R</Kbd>: Select rotation gizmo.
							</div>
							<div>
								<Kbd>⌘D</Kbd> or <Kbd>CTRL+D</Kbd>: Select scaling gizmo.
							</div>

							<br />

							<div>
								<Kbd>⌘B</Kbd> or <Kbd>CTRL+B</Kbd>: Play / Stop scene in preview panel.
							</div>

							<br />

							<div>
								<Kbd>⌘M</Kbd> or <Kbd>CTRL+M</Kbd>: Minimize focused window.
							</div>
							<div>
								<Kbd>⌘W</Kbd> or <Kbd>CTRL+W</Kbd>: Close focused windows.
							</div>
						</div>

						<NextChapterComponent href="/documentation/creating-project" title="Creating project" />
					</div>
				</Fade>
			</div>
		</main>
	);
}

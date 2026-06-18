"use client";

import { Fade } from "react-awesome-reveal";

import { Kbd } from "@/components/ui/kbd";

export default function DocumentationCreatingSkyboxPage() {
	return (
		<main className="w-full min-h-screen p-5 bg-black text-neutral-50">
			<div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
				<Fade cascade damping={0.1} triggerOnce className="w-full">
					<Fade>
						<div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">Shortcuts</div>
					</Fade>
				</Fade>

				<Fade triggerOnce>
					<div className="flex flex-col gap-4">
						<div className="text-3xl md:text-2xl lg:text-3xl my-3">In Editor</div>

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
					</div>
				</Fade>
			</div>
		</main>
	);
}

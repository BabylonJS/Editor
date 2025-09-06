"use client";

import Link from "next/link";

import { ReactLenis } from "lenis/react";
import { useEventListener } from "usehooks-ts";

import { Fade } from "react-awesome-reveal";
import { useEffect, useRef, useState } from "react";

import { GiBookmarklet } from "react-icons/gi";
import { IoMdPlayCircle } from "react-icons/io";
import { FaToolbox, FaYoutube } from "react-icons/fa6";
import { IoLogoGithub, IoSpeedometer } from "react-icons/io5";

import { AppleIcon } from "@/components/icons/apple";
import { WindowsIcon } from "@/components/icons/windows";

import { DownloadMacComponent } from "@/components/download-mac";
import { DownloadWindowsComponent } from "@/components/download-windows";

import { LandingRendererComponent } from "./renderer";

export default function HomePage() {
	const section1Ref = useRef<HTMLDivElement>(null);
	const section2Ref = useRef<HTMLDivElement>(null);
	const section3Ref = useRef<HTMLDivElement>(null);

	const [scrollRatio, setScrollRatio] = useState(0);

	const [featuresVisible, setFeaturesVisible] = useState(false);

	const [section2Visible, setSection2Visible] = useState(false);
	const [section3Visible, setSection3Visible] = useState(false);

	useEffect(() => {
		updateScrollRatio();

		// window.scrollTo({ top: 0, behavior: "instant" });
	}, []);

	useEventListener("scroll", () => {
		if (section2Ref.current) {
			const bb = section2Ref.current.getBoundingClientRect();

			setSection2Visible(bb.top <= 0 && bb.bottom > 0);
			setFeaturesVisible(bb.top < screen.height * 0.5 && bb.bottom > 0);
		}

		if (section3Ref.current) {
			const bb = section3Ref.current.getBoundingClientRect();
			setSection3Visible(bb.top <= 0 && bb.bottom > 0);
		}

		updateScrollRatio();
	});

	function updateScrollRatio() {
		setScrollRatio(window.scrollY / (document.body.scrollHeight - screen.height));
	}

	return (
		<ReactLenis root>
			<main className="min-w-screen min-h-screen text-neutral-50">
				<div
					style={{
						filter: `brightness(${featuresVisible ? 0 : 1})`,
					}}
					className="fixed top-0 left-0 w-screen h-screen z-0 transition-all duration-1000 ease-in-out"
				>
					<LandingRendererComponent scrollRatio={scrollRatio} postProcessVisible={!section3Visible} />
				</div>

				<div className="absolute 2xl:fixed top-0 left-0 w-full px-5 z-50">
					<div className="flex justify-between items-center w-full">
						<img alt="" src="/logo.svg" className="h-14 lg:h-20 -ml-12" />

						<Link
							href="/download"
							onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
							className={`hidden lg:flex items-center gap-2 text-black bg-neutral-50 rounded-full px-5 py-2 ${section2Visible ? "" : "pointer-events-none opacity-0"} transition-all duration-1000 ease-in-out`}
						>
							Download
						</Link>
					</div>
				</div>

				{/* Page 1 */}
				<div className="flex flex-col justify-center md:justify-end items-center gap-5 w-screen min-h-screen max-w-7xl mx-auto" ref={section1Ref}>
					<div className="flex flex-col gap-4 w-full">
						<Fade cascade damping={0.1} triggerOnce direction="up">
							<Fade>
								<div className="text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-semibold font-sans drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] tracking-tighter text-center px-5">
									Babylon.js Editor
								</div>
							</Fade>

							<Fade>
								<div className="text-center text-xl md:text-3xl max-w-64 md:max-w-max font-semibold tracking-tighter drop-shadow-[0_1px_1px_rgba(0,0,0,1)] mx-auto px-5">
									Focus more on <b className="text-[hsl(254,50%,60%)]">creating</b> and less on <b className="text-[rgb(187,70,75)]">coding</b>.
								</div>
							</Fade>

							<div className="hidden lg:flex justify-center gap-4 pt-4">
								<Link href="/download">
									<DownloadWindowsComponent />
								</Link>

								<Link href="/download">
									<DownloadMacComponent />
								</Link>
							</div>

							<div className="w-full h-full object-contain">
								<img alt="" src="/screenshots/large.png" className="max-h-[65dvh] object-contain z-50 mx-auto hidden sm:hidden md:hidden lg:hidden xl:block" />
								<img alt="" src="/screenshots/medium.png" className="max-h-[75dvh] object-contain z-50 mx-auto hidden sm:hidden md:hidden lg:block xl:hidden" />
								<img alt="" src="/screenshots/small.png" className="max-h-[75dvh] object-contain z-50 mx-auto lg:hidden" />
							</div>
						</Fade>
					</div>
				</div>

				{/* Page 2 */}
				<div className="flex flex-col justify-center pt-10 lg:pt-24 w-screen min-h-screen mx-auto" ref={section2Ref}>
					<div
						className={`flex flex-col lg:flex-row w-full py-10 lg:py-24 ${featuresVisible ? "bg-neutral-950" : "transparent"} z-0 px-5 transition-all duration-3000 ease-in-out`}
					>
						<Fade triggerOnce className="hidden lg:block w-full">
							<IoSpeedometer size={128} className="mx-auto" />
						</Fade>

						<Fade triggerOnce className="w-full">
							<div className="flex flex-col justify-center gap-2">
								<div className="flex justify-between items-center text-3xl drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
									Built-in Templates
									<div className="lg:hidden flex gap-2">
										<IoSpeedometer />
									</div>
								</div>
								<div className="drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
									Kickstart your development with built-in templates, including{" "}
									<Link target="_blank" href="https://nextjs.org" className="underline underline-offset-4">
										Next.js
									</Link>
									,{" "}
									<Link target="_blank" href="https://www.solidjs.com" className="underline underline-offset-4">
										SolidJS
									</Link>{" "}
									and Vanilla templates, allowing you to bypass the tedious setup process and dive straight into building your project.
									<br />
									Those templates come with example code, making it easier for you to understand and implement complex game mechanics quickly and efficiently.
								</div>
							</div>
						</Fade>
					</div>

					<div className={`flex flex-col lg:flex-row w-full max-w-7xl mx-auto pt-10 py-10 lg:py-24 px-5`}>
						<div className="flex justify-center items-center max-w-7xl mx-auto">
							<Fade triggerOnce className="w-full">
								<div className="flex flex-col justify-center gap-2">
									<div className="flex justify-between items-center text-3xl drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
										Open-Source
										<div className="lg:hidden flex gap-2">
											<IoLogoGithub />
										</div>
									</div>
									<div className="drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
										The Babylon.js Editor is an open-source project maintained by the community. The sources are available on{" "}
										<Link target="_blank" href="https://github.com/BabylonJS/Editor" className="underline underline-offset-4">
											Github
										</Link>
										.
										<br />
										Enjoy features and improvements driven by community feedbacks and contributions, ensuring the Editor evolves to meet the real-world needs of
										its users.
									</div>
								</div>
							</Fade>

							<Fade triggerOnce className="hidden lg:block w-full">
								<IoLogoGithub size={128} className="mx-auto" />
							</Fade>
						</div>
					</div>

					<div
						className={`flex flex-col lg:flex-row w-full py-10 lg:py-24 ${featuresVisible ? "bg-neutral-950" : "transparent"} z-0 px-5 transition-all duration-3000 ease-in-out`}
					>
						<Fade triggerOnce className="w-full">
							<div className="hidden lg:block relative w-44 h-44 mx-auto">
								<div className="absolute top-1/2 left-1/2 -translate-x-[calc(50%+32px)] -translate-y-[calc(50%+42px)] scale-[2] lg:scale-[5]">
									<WindowsIcon color="#fff" />
								</div>
								<div className="absolute top-1/2 left-1/2 -translate-x-[calc(50%-64px)] -translate-y-[calc(50%-42px)] scale-[2] lg:scale-[5]">
									<AppleIcon color="#fff" />
								</div>
							</div>
						</Fade>

						<Fade triggerOnce className="w-full">
							<div className="flex flex-col justify-center gap-2">
								<div className="flex justify-between items-center text-3xl drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
									Cross-Platform
									<div className="lg:hidden flex gap-2">
										<WindowsIcon color="#fff" />
										<AppleIcon color="#fff" />
									</div>
								</div>
								<div className="drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
									The Babylon.js Editor is available on both Windows and macOS.
									<br />
									Enjoy a unified development environment that supports all major platforms, allowing you to focus on creativity and innovation rather than
									compatibility issues.
									<br />
									Leverage the power of modern Web technologies to create stunning 3D video games and applications, all within an user-friendly Editor
									application.
								</div>
							</div>
						</Fade>
					</div>

					<div className={`flex flex-col lg:flex-row w-full max-w-7xl mx-auto py-10 lg:py-24 px-5`}>
						<div className="flex justify-center items-center max-w-7xl mx-auto">
							<Fade triggerOnce className="w-full">
								<div className="flex flex-col justify-center gap-2">
									<div className="flex justify-between items-center text-3xl drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
										Integrated Tools
										<div className="lg:hidden flex gap-2">
											<FaToolbox />
										</div>
									</div>
									<div className="drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
										Enhance your development process, enabling you to bring your most ambitious projects to life with ease and efficiency.
										<br />
										Experience the power of high-resolution textures with support of advanced formats like automatic KTX compressed textures. This feature
										allows to incorporate stunning 4K textures into your projects, optimizing performance without sacrificing visual quality.
									</div>
								</div>
							</Fade>

							<Fade triggerOnce className="hidden lg:block w-full">
								<FaToolbox size={128} className="mx-auto" />
							</Fade>
						</div>
					</div>

					<div className="relative flex flex-col justify-center items-center w-screen min-h-screen bg-neutral-950">
						<div className="flex flex-col gap-20 justify-center items-center w-full px-5 lg:pt-20 lg:pb-10">
							<Fade triggerOnce>
								<div className="text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-semibold font-sans drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] tracking-tighter text-center px-5">
									Mansion Experiment
								</div>
							</Fade>

							<Fade triggerOnce delay={150}>
								<div className="group relative w-full lg:max-w-[50vw] border-[10px] border-black/80 rounded-lg select-none cursor-pointer">
									<video loop muted autoPlay playsInline className="w-full h-full object-cover">
										<source src="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/experiments/mansion/cover.mp4" type="video/mp4" />
									</video>

									<Link
										target="_blank"
										href="https://youtu.be/vg5E8CY2F5w?si=-rEoBhdAmq-Opz9K"
										className={`
											absolute top-0 left-0 flex flex-col justify-center items-center w-full h-full
											opacity-0 group-hover:opacity-100
											transition-all duration-300 ease-in-out
										`}
									>
										<button className="text-neutral-950 hover:text-neutral-100 transition-all duration-300 ease-in-out">
											<IoMdPlayCircle className="w-32 h-32" />
										</button>
									</Link>
								</div>
							</Fade>

							<Fade triggerOnce delay={300}>
								<div className="leading-6 drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
									To celebrate the release of Babylon.js Editor v5, a POC of a cinematic editor has been developed to produce a <b>short film</b>.
									<br />
									This short film has been made 100% using the Babylon.js Editor from <b>scene assembly</b> and <b>lighting</b> to animating.
									<br />
									The Editor’s promise: bringing simplicity & fluidity to the creation of 3D games and applications. 3D models come from Quixel, Sketchfab and
									Fab.com.
								</div>
							</Fade>

							<Fade triggerOnce delay={450}>
								<Link target="_blank" href="https://youtu.be/vg5E8CY2F5w?si=gWJ6o5-h3P8cyTuD">
									<button className="flex items-center gap-2 text-black bg-neutral-50 rounded-full px-5 py-2">
										<FaYoutube className="w-6 h-6" />
										Watch on Youtube
									</button>
								</Link>
							</Fade>
						</div>
					</div>

					<div className="relative flex flex-col w-screen h-screen bg-black">
						<Fade triggerOnce className="flex justify-center items-center w-full p-10 lg:pt-20 lg:pb-0">
							<div className="flex flex-col gap-10">
								<div className="text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-semibold font-sans drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] tracking-tighter text-center px-5">
									Documentation
								</div>

								<GiBookmarklet color="white" className="w-52 h-52 lg:w-96 lg:h-96 mx-auto drop-shadow-[0_1px_1px_rgba(0,0,0,1)]" />

								<div className="text-center drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
									Learn how to use the Babylon.js Editor and start building your own video game or app.
									<br />
									Once you have covered all the chapters you will be aware, at a foundation level, of what the Babylon.js Editor has to offer you.
								</div>

								<div className="flex justify-center">
									<Link href="/documentation" className="flex justify-center items-center gap-2 text-black bg-neutral-50 rounded-full px-5 py-2">
										Go to documentation
									</Link>
								</div>
							</div>
						</Fade>

						<Fade triggerOnce className="flex justify-center items-center w-full bg-black">
							<video className="w-full h-full object-contain" autoPlay muted playsInline loop>
								<source src="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/bjs_speedesign.mp4" type="video/mp4" />
							</video>
						</Fade>
					</div>
				</div>

				{/* Page 3 */}
				{/* <div className="flex flex-col justify-between w-screen min-h-screen max-w-3xl px-5 mx-auto" ref={section3Ref}>
                    <div />

                    <div className="text-center max-w-3xl mx-auto">
                        <Fade className="text-7xl" triggerOnce>
                            See it in action
                        </Fade>
                    </div>

                    <div />
                </div> */}

				<div className="flex flex-col justify-between w-screen h-[100dvh] max-w-3xl px-5 mx-auto" />

				{/* Page 4 */}
				<div className="flex flex-col justify-center items-center gap-5 w-screen min-h-screen max-w-3xl px-5 mx-auto">
					<div className="text-4xl md:text-7xl font-semibold font-sans drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] tracking-tighter text-center px-5">
						<Fade>Babylon.js Editor</Fade>
					</div>

					<div className="text-xl text-center drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
						<Fade>Download for Windows and macOS</Fade>
					</div>

					<div className="flex flex-col lg:flex-row justify-center items-center gap-4 pt-4">
						<Fade>
							<Link href="/download">
								<DownloadWindowsComponent />
							</Link>
						</Fade>

						<Fade>
							<Link href="/download">
								<DownloadMacComponent />
							</Link>
						</Fade>
					</div>
				</div>
			</main>
		</ReactLenis>
	);
}

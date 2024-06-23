"use client";

import { ReactLenis } from "lenis/react";
import { Fade } from "react-awesome-reveal";
import { useEventListener } from "usehooks-ts";
import { useEffect, useRef, useState } from "react";

import { DownloadMacComponent } from "@/components/download-mac";
import { DownloadWindowsComponent } from "@/components/download-windows";

import { LandingRendererComponent } from "./renderer";

export default function Home() {
    const section2Ref = useRef<HTMLDivElement>(null);
    const section3Ref = useRef<HTMLDivElement>(null);

    const [scrollRatio, setScrollRatio] = useState(0);

    const [section2Visible, setSection2Visible] = useState(false);
    const [section3Visible, setSection3Visible] = useState(false);

    useEffect(() => {
        updateScrollRatio();
    }, []);

    useEventListener("scroll", () => {
        if (section2Ref.current) {
            const bb = section2Ref.current.getBoundingClientRect();
            setSection2Visible(bb.top <= 0 && bb.bottom > 0);
        }

        if (section3Ref.current) {
            const bb = section3Ref.current.getBoundingClientRect();
            setSection3Visible(bb.top <= 0 && bb.bottom > 0);
        }

        updateScrollRatio();
    });

    function updateScrollRatio() {
        setScrollRatio((window.scrollY) / (document.body.scrollHeight - screen.height));
    }

    return (
        <ReactLenis root>
            <main className="min-w-screen min-h-screen text-neutral-50">
                <div className="fixed top-0 left-0 w-screen h-screen z-0">
                    <LandingRendererComponent
                        scrollRatio={scrollRatio}
                        postProcessVisible={!section3Visible}
                    />
                </div>

                <div className="absolute 2xl:fixed top-0 left-0 w-full px-5">
                    <div className="flex justify-between items-center w-full">
                        <img alt="" src="/logo.svg" className="h-14 lg:h-20 -ml-12" />

                        <div className={`hidden lg:flex gap-2 ${section2Visible ? "" : "pointer-events-none opacity-0"} transition-all duration-1000 ease-in-out`}>
                            <button className={`flex items-center gap-2 text-black bg-neutral-50 rounded-full px-5 py-2`}>
                                Download
                            </button>
                        </div>
                    </div>
                </div>

                {/* Page 1 */}
                <div className="flex flex-col justify-center md:justify-end items-center gap-5 w-screen h-screen max-w-7xl mx-auto">
                    <div className="flex flex-col gap-4 w-full">
                        <Fade cascade damping={0.1} triggerOnce direction="up">
                            <Fade>
                                <div className="text-5xl md:text-8xl lg:text-9xl font-semibold font-sans drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] tracking-tighter text-center px-5">
                                    Babylon.js Editor
                                </div>
                            </Fade>

                            <Fade>
                                <div className="text-center text-xl md:text-3xl max-w-64 md:max-w-max font-semibold tracking-tighter drop-shadow-[0_1px_1px_rgba(0,0,0,1)] mx-auto px-5">
                                    Focus more on <b className="text-[hsl(254,50%,60%)]">creating</b> and less on <b className="text-[rgb(187,70,75)]">coding</b>.
                                </div>
                            </Fade>

                            {/* <div className="text-center text-sm lg:text-lg max-w-3xl tracking-tighter drop-shadow-[0_1px_1px_rgba(0,0,0,1)] mx-auto px-5">
                                The mission is to provide community-driven powerful and simple tools that help Babylon.JS users to create beautiful, awesome 3D games / applications.
                            </div> */}
                            <div className="flex justify-center gap-4 pt-4">
                                <DownloadWindowsComponent />
                                <DownloadMacComponent />
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
                <div className="flex flex-col justify-between w-screen h-screen max-w-3xl px-5 mx-auto" ref={section2Ref}>
                    <div className="text-center max-w-3xl mx-auto">
                        <Fade className="text-7xl">
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit
                        </Fade>
                    </div>

                    <div />
                </div>

                {/* Page 3 */}
                <div className="flex flex-col justify-between w-screen h-screen max-w-3xl px-5 mx-auto" ref={section3Ref}>
                    <div />

                    <div className="text-center max-w-3xl mx-auto">
                        <Fade className="text-7xl">
                            Take a look
                        </Fade>
                    </div>

                    <div />
                </div>

                <div className="flex flex-col justify-between w-screen h-screen max-w-3xl px-5 mx-auto">

                </div>

                {/* Page 4 */}
                <div className="flex flex-col justify-between w-screen h-screen max-w-3xl px-5 mx-auto">
                    <div className="text-center max-w-3xl mx-auto">
                        <Fade className="text-7xl">
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit
                        </Fade>
                    </div>

                    <div />
                </div>

                {/* Page 5 */}
                <div className="flex flex-col justify-center items-center gap-5 w-screen h-[150vh] pt-[50dvh] max-w-3xl px-5 mx-auto">
                    <div className="text-4xl md:text-7xl drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                        <Fade>
                            Babylon.JS Editor
                        </Fade>
                    </div>

                    <div className="text-xl text-center drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                        <Fade>
                            Focus more on creating and less on coding.
                        </Fade>
                    </div>

                    <div className="text-center text-sm max-w-3xl mx-auto drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                        <Fade>
                            The Babylon.JS Editor is an open source project maintained by the community. The mission is to provide community-driven powerful and simple tools that help Babylon.JS users to create beautiful, awesome 3D games / applications. It comes with deep customization features and is built using Electron to support cross-platform development. Using the latest version of Babylon.JS, the Editor allows creating highly customizable 3D web project skeletons based on the powerful ES6 modules version of Babylon.JS.
                        </Fade>
                    </div>
                </div>
            </main>
        </ReactLenis>
    );
}

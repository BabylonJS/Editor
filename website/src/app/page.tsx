"use client";

import { ReactLenis } from "lenis/react";
import { useRef, useState } from "react";
import { Fade } from "react-awesome-reveal";
import { useEventListener } from "usehooks-ts";

import { LandingRendererComponent } from "./renderer";

export default function Home() {
    const section2Ref = useRef<HTMLDivElement>(null);

    const [section2Visible, setSection2Visible] = useState(false);

    useEventListener("scroll", () => {
        if (section2Ref.current) {
            const bb = section2Ref.current.getBoundingClientRect();
            setSection2Visible(bb.top <= 0 && bb.bottom > 0);
        }
    });

    return (
        <ReactLenis root>

            <main className="min-w-screen min-h-screen text-white dark:text-white">
                <div className="fixed top-0 left-0 w-screen h-screen z-0">
                    <LandingRendererComponent postProcessVisible={!section2Visible} />
                </div>

                <div className="fixed top-2 left-5">
                    <img alt="" src="/logo.svg" className="h-14 lg:h-20 -ml-5" />
                </div>

                <div className="flex flex-col justify-center lg:justify-between items-center gap-5 w-screen h-screen max-w-7xl lg:pt-96 px-5 mx-auto">
                    <Fade cascade duration={2000} damping={0.1} triggerOnce direction="up">
                        <Fade>
                            <div className="text-4xl md:text-7xl lg:text-9xl font-semibold font-sans drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] tracking-tighter">
                                Babylon.js Editor
                            </div>
                        </Fade>

                        <Fade>
                            <div className="text-xl md:text-3xl text-center max-w-64 md:max-w-max font-semibold drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                                Focus more on <b className="text-[hsl(254,50%,60%)]">creating</b> and less on <b className="text-[rgb(187,70,75)]">coding</b>.
                            </div>
                        </Fade>

                        <Fade>
                            <div className="text-center text-sm lg:text-lg max-w-3xl mx-auto drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                                The mission is to provide community-driven powerful and simple tools that help Babylon.JS users to create beautiful, awesome 3D games / applications.
                            </div>
                        </Fade>

                        <Fade>
                            <img alt="" src="/screenshots/large.png" className="w-full h-full object-contain z-50 hidden sm:hidden md:hidden lg:hidden xl:block" />
                            <img alt="" src="/screenshots/medium.png" className="w-full h-full object-contain z-50 hidden sm:hidden md:hidden lg:block xl:hidden" />
                            <img alt="" src="/screenshots/small.png" className="w-full h-full object-contain z-50 lg:hidden" />
                        </Fade>
                    </Fade>
                </div>

                <div className="flex flex-col justify-between w-screen h-screen max-w-3xl px-5 mx-auto">

                </div>

                <div className="flex flex-col justify-between w-screen h-screen max-w-3xl px-5 mx-auto" ref={section2Ref}>
                    <div />

                    <div className="text-center max-w-3xl mx-auto">
                        <Fade className="text-7xl">
                            Take a look
                        </Fade>
                    </div>

                    <div />
                </div>

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
        </ReactLenis >
    );
}

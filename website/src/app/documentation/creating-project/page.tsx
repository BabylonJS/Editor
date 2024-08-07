"use client";

import Link from "next/link";

import { Fade } from "react-awesome-reveal";
import { IoIosWarning } from "react-icons/io";

import { NextChapterComponent } from "../components/next-chapter";

export default function DocumentationCreatingProjectPage() {
    return (
        <main className="w-full min-h-screen p-5 bg-black text-neutral-50">
            <div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
                <Fade cascade damping={0.1} triggerOnce className="w-full">
                    <Fade>
                        <div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">
                            Creating a project
                        </div>
                    </Fade>
                </Fade>

                <Fade triggerOnce>
                    <div className="flex flex-col gap-4">
                        <div className="text-3xl md:text-2xl lg:text-3xl my-3">
                            Dashboard
                        </div>

                        <div>
                            When opening the Babylon.JS Editor application, the first window that appears is the dashboard.
                            <br />
                            The dashboard is the place where you can create, open, and manage your projects.
                            <br />
                            By default, the dashboard is empty showing no project has been found.
                        </div>

                        <img alt="" src="/documentation/creating-project/dashboard.png" />

                        <div>
                            Two options here:
                            <ul className="list-disc">
                                <li>
                                    Click the "<b>Create project</b>" button to create a new project.
                                </li>
                                <li>
                                    Click the "<b>Import project</b>" in order to register and already existing project in the dashboard.
                                </li>
                            </ul>
                        </div>

                        <div className="text-3xl md:text-2xl lg:text-3xl my-3">
                            Create project
                        </div>

                        <div className="flex gap-2 items-center">
                            <IoIosWarning size="32px" />

                            <div className="italic">
                                A new project is created based on a template that runs with <b>Next.JS</b>. It is highly recommanded to have a basic understanding
                                of <b><Link target="_blank" href="https://fr.react.dev/" className="underline underline-offset-4">React</Link></b> and <b><Link target="_blank" href="https://nextjs.org" className="underline underline-offset-4">Next.JS</Link></b> before starting.
                            </div>
                        </div>

                        <div>
                            When creating a new project, the dashboard asks for a folder where to locate the created project.
                            <br />
                            Click the "<b>Browse...</b>" button and select an <b>empty</b> folder.
                        </div>

                        <img alt="" src="/documentation/creating-project/select-folder.png" />

                        <div>
                            Once you are ready, just click the "<b>Create</b>" button and a new project will appear in the dashboard.
                            <br />
                            This project is now ready to be opened and edited. Because it has never been opened, a "question mark" icon is displayed. Each time a project is saved in the editor, the icon will change to a preview image of the project.
                        </div>

                        <img alt="" src="/documentation/creating-project/project-created.png" />

                        <div>
                            Now, to open and edit the project, just double-click the project in the dashboard and the editor will open.
                        </div>

                        <img alt="" src="/documentation/creating-project/project-opened.png" />

                        <div>
                            Each time a project is opened, the editor will update all dependencies by itself using "<b>yarn</b>". This step is mandatory and cannot be skipped.
                            <br />
                            Dependencies are updated automatically to ensure the project is always up-to-date and working properly.
                        </div>

                        <div>
                            Moreover, the editor supports plugins. Those plugins can be installed "<b>per-project</b>" so they are, by definition, dependencies of the project that must be updated.
                        </div>

                        <div className="text-3xl md:text-2xl lg:text-3xl my-3">
                            Import project
                        </div>

                        <div>
                            In case you already created a project and want to import it in your dashboard, you can use the "<b>Import project</b>" button.
                            <br />
                            The dashboard configuration is local to the computer. It means that if you have a project on another computer, you can import it in the dashboard of the current computer.
                        </div>

                        <div className="flex gap-4">
                            <img alt="" src="/documentation/creating-project/import-project-browse.png" className="h-64 object-contain rounded-lg" />

                            <div>
                                <div>
                                    When importing a project, the dashboard asks for the project file. Just locate the right folder and select the "<b>.bjseditor</b>" file.
                                </div>

                                <div>
                                    Click "<b>Open</b>" and the project will be imported in the dashboard.
                                </div>
                            </div>
                        </div>

                        <NextChapterComponent href="/documentation/composing-scene" title="Composing scene" />
                    </div>
                </Fade>
            </div>
        </main>
    );
}

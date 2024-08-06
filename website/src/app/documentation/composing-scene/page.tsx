"use client";

import Link from "next/link";

import { Fade } from "react-awesome-reveal";

import { CustomLink } from "../components/link";
import { NextChapterComponent } from "../components/next-chapter";

export default function DocumentationComposingScenePage() {
    return (
        <main className="w-full min-h-screen p-5 bg-black text-neutral-50">
            <div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
                <Fade cascade damping={0.1} triggerOnce className="w-full">
                    <Fade>
                        <div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">
                            Composing scene
                        </div>
                    </Fade>
                </Fade>

                <Fade triggerOnce>
                    <div className="flex flex-col gap-4">
                        <div className="text-3xl md:text-2xl lg:text-3xl my-3">
                            Introduction
                        </div>

                        <div>
                            The layout of the editor is divided into 4 main parts:
                        </div>

                        <ul className="list-disc">
                            <li>
                                <b>Graph</b>: by default on the left side, shows the structure of the scene that is being edited.
                            </li>
                            <li>
                                <b>Preview</b>: by default in center, where you can see and interact with the scene.
                            </li>
                            <li>
                                <b>Inspector</b>: by default on the right side, where you can see and edit the properties of the selected object.
                            </li>
                            <li>
                                <b>Assets Browser</b>: by default on the bottom side, where you can see and manage the assets of the project (textures, materials, meshes, etc.).
                            </li>
                        </ul>

                        <div>
                            Each time a node is clicked in the graph or in the preview, the inspector is updated to show the properties of the selected object.
                            <br />
                            The layout of the inspector may change according to the nature of the edited object.
                        </div>

                        <img alt="" src="/documentation/composing-scene/select-object.gif" className="h-[512px] object-contain" />

                        <div className="text-3xl md:text-2xl lg:text-3xl my-3">
                            Using gizmos
                        </div>

                        <div>
                            In order to move, rotate and scale selected object, gizmos may be used.
                            <br />
                            For a complete understanding of gizmos, you can refer to this <b><CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/mesh/gizmo">Babylon.JS documentation</CustomLink></b>
                        </div>

                        <div>
                            In the editor, gizmos are available in the preview's panel toolbar or via shortcut:
                        </div>

                        <ul className="list-disc">
                            <li>CTRL+T or ⌘+T for <b>Position</b> gizmos</li>
                            <li>CTRL+R or ⌘+R for <b>Rotation</b> gizmos</li>
                            <li>CTRL+D or ⌘+D for <b>Scaling</b> gizmos</li>
                        </ul>

                        <img alt="" src="/documentation/composing-scene/gizmos-toolbar.gif" />

                        <div className="text-3xl md:text-2xl lg:text-3xl my-3">
                            Adding objects
                        </div>

                        <div>
                            The editor supports adding primitive objects such as meshes, lights and cameras.
                            <br />
                            By default, the template already contains an <b><CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/cameras/camera_introduction#universal-camera">Universal camera</CustomLink></b>,
                            a <b><CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/lights/lights_introduction#the-point-light">Point light</CustomLink></b>,
                            a <b><CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/mesh/creation/set/box">Box</CustomLink></b> and
                            a <b><CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/mesh/creation/set/ground">Ground</CustomLink></b>.
                        </div>

                        <div>
                            You can add more objects by clicking on the <b>Add</b> button in the main toolbar of the editor. Each time a new object is added, it is placed at the center of the scene and the graph is updated in order to show the newly added node.
                        </div>

                        <img alt="" src="/documentation/composing-scene/adding-objects.png" />

                        <div>
                            Each object can be customized. Those meshes (box, sphere, ground, etc.) are called "primitives" and their geometry is generated automatically by Babylon.JS.
                            Those geometries are created using default values and you can edit them in the inspector.
                        </div>

                        <div className="text-3xl md:text-2xl lg:text-3xl my-3">
                            Adding custom 3d models
                        </div>

                        <div>
                            The editor supports multiple file formats for 3D models such as <b>.glb</b>, <b>.gltf</b>, <b>.obj</b>, <b>.fbx</b>, <b>.babylon</b>, <b>.stl</b> and <b>.blend</b>.
                        </div>

                        <div className="italic">
                            <b className="underline underline-offset-4">Note</b>: each time a <b>.fbx</b> is imported, the editor will send the file to our server in order to be converted automatically.
                            <br />
                            The server is located at <CustomLink href="https://editor.babylonjs.com/">editor.babylonjs.com</CustomLink> and you can find the sources of the converter <CustomLink href="https://github.com/BabylonJS/Editor/tree/feature/5.0.0/website/src/app/api/converter">here on Github</CustomLink>.
                        </div>

                        <div>
                            To do so, let's add our first 3d model in the assets of the project. Using the <b>Assets Browser</b>, click "<b>Import</b>". A file dialog appears, select all the files of the 3d model (3d file and textures) and click "<b>Open</b>".
                        </div>

                        <img alt="" src="/documentation/composing-scene/import-3d-models.gif" />

                        <div>
                            In order to keep the assets organized, you can create folders in the assets browser by right-clicking on the panel and by selecting the "<b>New Folder</b>" option. To rename a folder or a file, just double-click on its name.
                            <br />
                            Once the folder is created, just double-click on it and import your assets in it.
                        </div>

                        <img alt="" src="/documentation/composing-scene/creating-folder.gif" />

                        <div>
                            Here, for this example, we imported a <b>.gltf</b> file with all its associated textures. In oder to import the 3d model, simply drag'n'drop the <b>.gltf</b> file on the preview.
                            <br />
                            Once loaded, the editor will place all the root nodes of the 3d model according to where the file was dropped in the preview.
                        </div>

                        <div>
                            Sometimes, models are exported with scales that differ from your projects. In order to fix this, simply select the root nodes and re-scale them using the inspector.
                            <div className="italic">
                                Note: Here we imported a <b>.gltf</b> file. The GLTF loader of Babylon.JS always creates a <b>__root__</b> node that we can use to re-scale the entire 3d model.
                            </div>
                        </div>

                        <img alt="" src="/documentation/composing-scene/importing-model.gif" />

                        When you add a 3d model, all its materials and textures are automatically applied on it (most of the time).

                        <div className="flex gap-4">
                            <img alt="" src="/documentation/composing-scene/show-hidden-files.png" className="w-96 object-contain" />

                            <div className="flex flex-col gap-4">
                                <div>
                                    In cases the loaded 3d model contains <b>embedded</b> textures, typically all <b>.glb</b> and some <b>.fbx</b> files, the editor will automatically extract them and place them in the assets browser in the same folder.
                                </div>

                                <div>
                                    In order to keep files organized, those generated texture files are hidden by default in the assets browser. You can show them by clicking on the <b>Filters</b> button on the right side and check "<b className="underline underline-offset-4">Show Generated Files</b>"
                                </div>
                            </div>
                        </div>

                        <div>
                            To make a file not hidden for the assets browser, just rename the file by removing the prefix "<b>editor-generated_</b>". Most of the time, you'll not need to touch those files.
                            <br />
                            But in case you have to modify those textures without modifying the original 3d model, you can iterate by replacing the texture directly in the assets browser.
                        </div>

                        <NextChapterComponent href="/documentation/adding-materials" title="Adding materials" />
                    </div>
                </Fade>
            </div>
        </main>
    );
}

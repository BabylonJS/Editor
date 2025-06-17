"use client";

import { Fade } from "react-awesome-reveal";

import { IoIosWarning } from "react-icons/io";

import { CustomLink } from "../components/link";
import { NextChapterComponent } from "../components/next-chapter";

export default function DocumentationManagingAssetsPage() {
    return (
        <main className="w-full min-h-screen p-5 bg-black text-neutral-50">
            <div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
                <Fade cascade damping={0.1} triggerOnce className="w-full">
                    <Fade>
                        <div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">
                            Managing assets
                        </div>
                    </Fade>
                </Fade>

                <Fade triggerOnce>
                    <div className="flex flex-col gap-4">
                        <div className="text-3xl md:text-2xl lg:text-3xl my-3">
                            Introduction
                        </div>

                        <div>
                            This chapter is linked to the previous one (<b>Composing scene</b>) but goes deeper into the management of assets. How to create your own materials, how to assign textures to materials, etc.
                        </div>

                        <div className="flex gap-2 items-center">
                            <IoIosWarning size="32px" />

                            <div>
                                It is important to note that all the assets used in your project must be located at least in the "<b>/assets</b>" folder in order to be correctly understood by the editor.
                                This "<b>assets</b>" folder is the root folder of all the assets used in your project and is also located in the root folder of your project.
                            </div>
                        </div>

                        <div className="text-3xl md:text-2xl lg:text-3xl my-3">
                            Creating your own materials
                        </div>

                        <div>
                            When importing a 3d model, most of the time it comes with its own materials and textures already configured. But sometimes you may want to have a deeper control over the materials and see how its related assets
                            (typically textures) appear using the Babylon.JS engine.
                        </div>

                        <div>
                            Let's start with an empty box that we created using the primitive objects of the editor. By default the box has no material assigned to it.
                        </div>

                        <img alt="" src="/documentation/managing-assets/empty-box.png" />

                        <div>
                            To create a new material, go in the "<b>assets</b>" folder in the "<b>Assets Browser</b>" panel and right click in order to show the context menu and select "<b>Add</b>".
                        </div>

                        <div>
                            The editor supports both <b>PBR</b> and <b>Standard</b> materials. Most of the time, it is recommended to add PBR materials as it became the norm today.
                            For more information about PBR materials, you can refer to this <b><CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/materials/using/introToPBR">excellent documentation</CustomLink></b> of Babylon.JS
                        </div>

                        <div>
                            Once you clicked on "<b>Add {"->"} PBR Material</b>", a new asset file appears named "<b>New PBR Material.material</b>". Double-click on its name and rename it to "<b>my-material.material</b>" or any other name you prefer.
                            Always keeping a constant and logical naming of assets is important to keep your assets organized.
                        </div>

                        <div className="mx-auto p-10 w-full object-contain">
                            <video muted autoPlay loop controls className="rounded-lg">
                                <source src="/documentation/managing-assets/creating-pbr-material.mp4" />
                            </video>
                        </div>

                        <div>
                            New created materials are empty by default. Now, to assign this material to the box or any other asset, you can drag and drop the material file on the desired mesh in the "<b>Preview</b>" panel.
                        </div>


                        <div className="flex gap-2 items-center">
                            <IoIosWarning size="32px" />

                            <div>
                                Materials that are created manually are shared across all objects it's applied to. For example, if the material is assigned to 2 distinct meshes and the material properties are edited, both meshes will be updated.
                            </div>
                        </div>

                        <div className="mx-auto p-10 w-full object-contain">
                            <video muted autoPlay loop controls className="rounded-lg">
                                <source src="/documentation/managing-assets/assigning-material.mp4" />
                            </video>
                        </div>

                        <div>
                            Your own material is now applied on the box! Now the goal is to edit the material properties using the "<b>Inspector</b>" panel. To do so, just click on the box in the "<b>Preview</b>" panel in order to edit the object.
                            <br />
                            Scroll a bit in the "<b>Inspector</b>" panel in order to see the "<b>Material</b>" section. Starting from here you can edit the material properties.
                        </div>

                        <div className="text-3xl md:text-2xl lg:text-3xl my-3">
                            Assigning textures to materials
                        </div>

                        <div>
                            Because newly created materials are empty, you may want to assign textures to them. As for 3d models, textures are assets that can be imported in the "<b>assets</b>" folder in the "<b>Assets Browser</b>" panel.
                            <br />
                            Let's create a "<b>pbr</b>" folder in the "<b>assets</b>" folder using the "<b>Assets Browser</b>" panel and import textures in it.
                        </div>

                        <div className="mx-auto p-10 w-full object-contain">
                            <video muted autoPlay loop controls className="rounded-lg">
                                <source src="/documentation/managing-assets/importing-textures.mp4" />
                            </video>
                        </div>

                        <div>
                            Here, 3 textures were imported:
                        </div>

                        <ul className="list-disc">
                            <li><b>Albedo texture</b>: the base color of the object.</li>
                            <li><b>Normal texture</b>: to simulate bump and dents on the object's surface. More information about bump mapping <b><CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/materials/using/moreMaterials#bump-map">here</CustomLink></b></li>
                            <li><b>Metallic texture</b>: texture containing both the metallic value in the B channel and the roughness value in the G channel to keep better precision. Ambient occlusion can also be saved in R channel.</li>
                        </ul>

                        <div>
                            To master the meaning of those textures, refer to the <b><CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/materials/using/introToPBR">Babylon.JS documentation</CustomLink></b>.
                        </div>

                        <div>
                            In the "<b>Inspector</b>" panel, all the available slots for textures are shown in the "<b>Material Textures</b>" section.
                            To assign a texture, just drag'n'drop the texture file from the "<b>Assets Browser</b>" panel to the slot in the inspector.
                        </div>

                        <div>
                            Once a texture is assigned, the slot is updated to show the preview of the texture and its potential properties to edit.
                        </div>

                        <div className="mx-auto p-10 w-full object-contain">
                            <video muted autoPlay loop controls className="rounded-lg">
                                <source src="/documentation/managing-assets/assigning-textures.mp4" />
                            </video>
                        </div>

                        <div>
                            As an advanced user, you may want to edit the properties of a texture in a material, just click on the preview of the texture in the "<b>Inspector</b>" panel.
                            <br />
                            A new panel appears showing all the properties of the texture. Here you can edit the properties of the texture to fit your needs.
                        </div>

                        <div className="mx-auto p-10 w-full object-contain">
                            <video muted autoPlay loop controls className="rounded-lg">
                                <source src="/documentation/managing-assets/editing-texture.mp4" />
                            </video>
                        </div>

                        <div>
                            Tip: you can also drag'n'drop a texture file directly on a mesh in the "<b>Preview</b>" panel. The editor will ask for the slot where to assign the texture.
                        </div>

                        <div className="mx-auto p-10 w-full object-contain">
                            <video muted autoPlay loop controls className="rounded-lg">
                                <source src="/documentation/managing-assets/assigning-texture-preview.mp4" />
                            </video>
                        </div>

                        <NextChapterComponent href="/documentation/running-project" title="Running project" />
                    </div>
                </Fade>
            </div>
        </main>
    );
}

"use client";

import { DocumentationSidebarItem } from "./item";

export function DocumentationSidebar() {
    return (
        <div className="fixed top-0 left-0 w-96 h-screen pt-32 px-5 border-r border-r-neutral-950 text-white">
            <div className="flex flex-col gap-1">
                <div className="font-semibold text-xl text-neutral-500 my-3">
                    Basics
                </div>

                <DocumentationSidebarItem title="Introduction" href="/documentation" />
                <DocumentationSidebarItem title="Creating project" href="/documentation/creating-project" />
                <DocumentationSidebarItem title="Composing scene" href="/documentation/composing-scene" />
                <DocumentationSidebarItem title="Managing assets" href="/documentation/managing-assets" />
                <DocumentationSidebarItem title="Running project" href="/documentation/running-project" />
                <DocumentationSidebarItem title="Adding scripts" href="/documentation/adding-scripts" />

                <div className="font-semibold text-xl text-neutral-500 my-3">
                    Advanced
                </div>

                <DocumentationSidebarItem title="Compressing textures" href="/documentation/advanced/compressing-textures" />
                <DocumentationSidebarItem title="LOD collisions" href="/documentation/advanced/lod-collisions" />
                <DocumentationSidebarItem title="Optimizing shadows" href="/documentation/advanced/optimizing-shadows" />
            </div>
        </div>
    );
}

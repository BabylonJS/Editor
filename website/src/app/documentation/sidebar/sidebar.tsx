"use client";

import { DocumentationSidebarItem } from "./item";

export function DocumentationSidebar() {
    return (
        <div className="w-96 min-h-screen pt-32 px-5 bg-black border-r border-r-neutral-950 text-white">
            <div className="flex flex-col gap-1">
                <DocumentationSidebarItem title="Introduction" href="/documentation" />
                <DocumentationSidebarItem title="Creating project" href="/documentation/creating-project" />
                <DocumentationSidebarItem title="Composing scene" href="/documentation/composing-scene" />
            </div>
        </div>
    );
}

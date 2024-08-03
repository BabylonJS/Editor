"use client";

import { DocumentationSidebarItem } from "./item";

export function DocumentationSidebar() {
    return (
        <div className="fixed top-0 left-0 w-96 h-screen pt-32 px-5 border-r border-r-neutral-950 text-white">
            <div className="flex flex-col gap-1">
                <DocumentationSidebarItem title="Introduction" href="/documentation" />
                <DocumentationSidebarItem title="Creating project" href="/documentation/creating-project" />
                <DocumentationSidebarItem title="Composing scene" href="/documentation/composing-scene" />
            </div>
        </div>
    );
}

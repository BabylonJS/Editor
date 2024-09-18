import { Component, ReactNode } from "react";

import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger } from "../../../ui/shadcn/ui/menubar";

export class EditorAnimationToolbar extends Component {
    public render(): ReactNode {
        return (
            <div className="w-full h-10 bg-primary-foreground">
                <Menubar className="border-none rounded-none pl-3 my-auto bg-primary-foreground h-10">
                    {/* File */}
                    <MenubarMenu>
                        <MenubarTrigger disabled>
                            File
                        </MenubarTrigger>

                        <MenubarContent className="border-black/50">
                            <MenubarItem>
                                Load Animation From...
                            </MenubarItem>
                            <MenubarSeparator />
                            <MenubarItem>
                                Save Animation As...
                            </MenubarItem>
                        </MenubarContent>
                    </MenubarMenu>
                </Menubar>
            </div>
        );
    }
}

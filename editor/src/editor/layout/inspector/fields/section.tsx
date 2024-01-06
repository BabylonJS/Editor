import { PropsWithChildren, ReactNode, useState } from "react";

import { PlusIcon, MinusIcon } from "@heroicons/react/20/solid";

export interface IEditorInspectorSectionFieldProps extends PropsWithChildren {
    /**
     * Defines the title of the section.
     */
    title: ReactNode;
    /**
     * Defines the label of the section drawn on the right side.
     */
    label?: ReactNode;
}

export function EditorInspectorSectionField(props: IEditorInspectorSectionFieldProps) {
    const [opened, setOpened] = useState(true);

    return (
        <div className="flex flex-col gap-2 w-full bg-secondary dark:bg-secondary/35 rounded-lg p-2">
            <div
                onClick={() => setOpened(!opened)}
                className="flex gap-2 items-center w-full pl-2 py-2 bg-muted-foreground/50 dark:bg-secondary/35 hover:bg-muted-foreground/75 dark:hover:bg-secondary rounded-lg cursor-pointer transition-all duration-300"
            >
                <div>
                    {opened && <MinusIcon width={20} />}
                    {!opened && <PlusIcon width={20} />}
                </div>

                <div className="flex justify-between w-full">
                    <div className="mt-0.5">
                        {props.title}
                    </div>

                    <div className="mt-0.5 text-white/50 pr-5">
                        {props.label}
                    </div>
                </div>
            </div>

            {opened && props.children}
        </div>
    );
}

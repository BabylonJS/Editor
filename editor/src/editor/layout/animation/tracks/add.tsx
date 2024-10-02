import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { IAnimatable } from "babylonjs";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../../../../ui/shadcn/ui/command";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../../ui/shadcn/ui/alert-dialog";

import { getAllAnimatableProperties } from "../tools/properties";

export interface IEditorAnimationAddTrackPromptProps {
    animatable: IAnimatable;
    onSelectProperty: (property: string | null) => void;
}

export function showAddTrackPrompt(animatable: IAnimatable): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
        const div = document.createElement("div");
        document.body.appendChild(div);

        const root = createRoot(div);
        root.render(
            <EditorAnimationAddTrackPrompt
                animatable={animatable}
                onSelectProperty={(property) => {
                    resolve(property);

                    root.unmount();
                    document.body.removeChild(div);
                }}
            />
        );
    });
}

export function EditorAnimationAddTrackPrompt(props: IEditorAnimationAddTrackPromptProps) {
    const [value, setValue] = useState("");
    const [properties, setProperties] = useState<string[]>([]);

    useEffect(() => {
        setProperties(getAllAnimatableProperties(props.animatable));
    }, []);

    return (
        <AlertDialog open>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Add new Track</AlertDialogTitle>
                    <AlertDialogDescription></AlertDialogDescription>
                </AlertDialogHeader>

                <Command className="border-muted border-[1px]">
                    <CommandInput
                        ref={(r) => r?.focus()}
                        onValueChange={(v) => setValue(v)}
                        placeholder="Search for a property to animate..."
                    />
                    <CommandList>
                        <CommandEmpty>
                            Animate "{value}"
                        </CommandEmpty>
                        <CommandGroup heading="Suggestions">
                            {properties.map((property) => (
                                <CommandItem onSelect={() => props.onSelectProperty(property)}>
                                    {property}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>

                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => props.onSelectProperty(null)}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={() => props.onSelectProperty(value)}>
                        Continue
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

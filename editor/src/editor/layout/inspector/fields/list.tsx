import { useEffect, useState } from "react";

// import { Select } from "@blueprintjs/select";
// import { Button, MenuItem } from "@blueprintjs/core";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../ui/shadcn/ui/select";

import { IEditorInspectorFieldProps, getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "./field";

export interface IEditorInspectorListFieldItem {
    text: string;
    value: any;

    label?: string;
}

export interface IEditorInspectorListFieldProps extends IEditorInspectorFieldProps {
    items: IEditorInspectorListFieldItem[];

    onChange?: (value: any) => void;
}

export function EditorInspectorListField(props: IEditorInspectorListFieldProps) {
    const [selectedItem, setSelectedItem] = useState<IEditorInspectorListFieldItem | null>(null);

    useEffect(() => {
        const property = getInspectorPropertyValue(props.object, props.property);

        const item = props.items.find((i) => i.value === property);
        if (item) {
            setSelectedItem(item);
        }
    }, []);

    function handleSetValue(value: string) {
        const item = props.items.find((i) => i.value === value);
        if (!item || item?.value === selectedItem?.value) {
            return;
        }

        setSelectedItem(item);

        setInspectorEffectivePropertyValue(props.object, props.property, item.value);
        props.onChange?.(item.value);
    }

    return (
        <div className="flex gap-2 items-center px-2">
            {props.label &&
                <div className="w-1/2 text-ellipsis overflow-hidden whitespace-nowrap">
                    {props.label}
                </div>
            }

            <Select
                value={selectedItem?.value}
                onValueChange={(v) => handleSetValue(v)}
            >
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Value..." />
                </SelectTrigger>
                <SelectContent>
                    {props.items.map((item) => (
                        <SelectItem key={item.text} value={item.value}>{item.text}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {/* <select
                className="w-full bg-black/50 text-white/75 px-5 py-2 rounded-lg outline-none transition-all duration-300"
            >
                {props.items.map((item, index) => (
                    <option
                        key={index}
                        value={item.value}
                    >
                        <div className="px-5 py-2 hover:bg-black/50 transition-all duration-300">
                            {item.text}
                        </div>
                    </option>
                ))}
            </select> */}
            {/* <Select
                resetOnQuery
                resetOnSelect
                scrollToActiveItem
                items={props.items}
                activeItem={selectedItem}
                itemRenderer={(item, props) => {
                    if (!props.modifiers.matchesPredicate) {
                        return null;
                    }

                    return <MenuItem
                        ref={props.ref}
                        key={props.index}
                        text={item.text}
                        label={item.label}
                        roleStructure="listoption"
                        active={props.modifiers.active}
                        disabled={props.modifiers.disabled}
                        className="transition-all duration-300"
                        onClick={(ev) => props.handleClick?.(ev)}
                    />;
                }}
                itemPredicate={(query, item) => {
                    const normalizedTitle = item.text.toLowerCase();
                    const normalizedQuery = query.toLowerCase();

                    return normalizedTitle.indexOf(normalizedQuery) >= 0;
                }}
                onItemSelect={(item) => {
                    if (item.value === selectedItem?.value) {
                        return;
                    }
                    setSelectedItem(item);

                    setInspectorEffectivePropertyValue(props.object, props.property, item.value);
                    props.onChange?.(item.value);
                }}
                query={query}
                onQueryChange={(query) => setQuery(query)}
                menuProps={{
                    style: {
                        padding: "0.5rem",
                    },
                }}
                popoverProps={{
                    minimal: true,
                    autoFocus: true,
                    hasBackdrop: true,
                    enforceFocus: true,
                }}
                popoverContentProps={{
                    style: {
                        padding: "0.5rem",
                        borderRadius: "0.5rem",
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                    },
                }}
                inputProps={{
                    placeholder: "Filter...",
                    style: {
                        outlineOffset: "2px",
                        outline: "2px solid transparent",

                        borderTopLeftRadius: query ? "0.5rem" : "0rem",
                        borderTopRightRadius: query ? "0.5rem" : "0rem",

                        color: "rgba(255, 255, 255, 0.75)",
                        backgroundColor: "rgba(0, 0, 0, 0.5)",

                        transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
                    },
                }}
                className="p-1 rounded-lg bg-black/50 text-white/75 outline-none w-full"
            >
                <Button minimal className="w-full" text={selectedItem?.text} />
            </Select> */}
        </div>
    );
}

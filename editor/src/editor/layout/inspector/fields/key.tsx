import { Fade } from "react-awesome-reveal";
import { ReactNode, useEffect, useRef, useState } from "react";

import { useOnClickOutside, useEventListener } from "usehooks-ts";

import { Button } from "../../../../ui/shadcn/ui/button";

export interface IEditorInspectorKeyFieldProps {
    value: string;
    onChange: (value: number) => void;

    label?: ReactNode;
}

export function EditorInspectorKeyField(props: IEditorInspectorKeyFieldProps) {
    const buttonRef = useRef<HTMLButtonElement>(null);

    const [setting, setSetting] = useState(false);
    const [value, setValue] = useState(props.value);

    useEffect(() => {
        setValue(props.value);
    }, [props.value]);

    useOnClickOutside(buttonRef, () => {
        setSetting(false);
    });

    useEventListener("keydown", (ev) => {
        if (setting) {
            const keyCode = ev.key.toUpperCase().charCodeAt(0);

            props.onChange(keyCode);

            setSetting(false);
            setValue(keyCode.toString());
        }
    });

    return (
        <div className="flex gap-2 items-center px-2">
            {props.label &&
                <div className="w-1/2 text-ellipsis overflow-hidden whitespace-nowrap">
                    {props.label}
                </div>
            }

            <Button ref={buttonRef} className="relative w-full bg-muted-foreground/20 hover:bg-muted-foreground/75 text-foreground" onClick={() => setSetting(true)}>
                <div className="absolute left-1/2 -translate-x-1/2">
                    {!setting &&
                        <Fade delay={0}>
                            {String.fromCharCode(parseInt(value))}
                        </Fade>
                    }

                    {setting &&
                        <Fade delay={0}>
                            Press a key...
                        </Fade>
                    }
                </div>
            </Button>
        </div>
    );
}

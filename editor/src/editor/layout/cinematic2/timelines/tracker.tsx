import { MouseEvent, useEffect, useRef, useState } from "react";

import { CinematicEditor } from "../editor";

import { configureDivEvents } from "./move";
import { waitNextAnimationFrame } from "../../../../tools/tools";

export interface ICinematicTrackerKey {
    type: "tracker";
    frame: number;
}

export interface ICinematicEditorTrackerProps {
    cinematicEditor: CinematicEditor;
    width: number;
    scale: number;
    currentTime: number;
}

export function CinematicEditorTracker(props: ICinematicEditorTrackerProps) {
    const [move, setMove] = useState(false);

    const divRef = useRef<HTMLDivElement>(null);

    const cinematicKey = useRef<ICinematicTrackerKey>({
        type: "tracker",
        frame: props.currentTime,
    });

    useEffect(() => {
        if (divRef.current) {
            configureDivEvents({
                div: divRef.current,
                cinematicEditor: props.cinematicEditor,
                cinematicKey: cinematicKey.current,
                onMoveStart: () => {
                    setMove(true);
                },
                onMove: () => {
                    props.cinematicEditor.timelines.setCurrentTime(cinematicKey.current.frame);
                },
                onMoveEnd: () => {
                    props.cinematicEditor.disposeTemporaryAnimationGroup();
                    waitNextAnimationFrame().then(() => {
                        setMove(false);
                    });
                },
            });
        }
    }, []);

    function handleMainDivClick(ev: MouseEvent<HTMLDivElement>) {
        if (!move) {
            const currentTime = Math.round(
                Math.max(0, ev.nativeEvent.offsetX / props.scale),
            );

            cinematicKey.current.frame = currentTime;
            props.cinematicEditor.timelines.setCurrentTime(currentTime);
        }
    }

    return (
        <div
            style={{
                width: `${props.width}px`,
            }}
            className="relative h-10 mx-2 py-5"
            onClick={handleMainDivClick}
        >
            <div
                ref={divRef}
                style={{
                    left: `${props.currentTime * props.scale}px`,
                }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-auto"
            >
                <div
                    className={`
                        w-7 h-7 rotate-45 bg-accent
                        ${move ? "" : "hover:scale-125 cursor-pointer"}
                        transition-transform duration-300 ease-in-out    
                    `}
                    style={{
                        mask: "linear-gradient(135deg, transparent 0%, transparent 50%, black 50%, black 100%)",
                    }}
                />
            </div>
        </div>
    );
}

import { useEffect, useState } from "react";

import { AnimationGroup } from "babylonjs";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../../../../ui/shadcn/ui/alert-dialog";

import { Editor } from "../../../main";

import { saveSingleFileDialog } from "../../../../tools/dialog";

import { EditorInspectorNumberField } from "../../inspector/fields/number";

import { ICinematic } from "../schema/typings";
import { generateCinematicAnimationGroup } from "../generate/generate";

import { CinematicRenderer, RenderType } from "./render";

export interface ICinematicRendererDialogProps {
    open: boolean;
    type?: RenderType;
    cinematic?: ICinematic;

    editor: Editor;
    renderer: CinematicRenderer;

    onClose: () => void;
}

export function CinematicRendererDialog(props: ICinematicRendererDialogProps) {
    const [animationGroup, setAnimationGroup] = useState<AnimationGroup | null>(null);

    useEffect(() => {
        if (animationGroup && !props.open && props.renderer.state.step !== "rendering") {
            animationGroup?.dispose();
            setAnimationGroup(null);
        }
    }, [props.open, animationGroup]);

    useEffect(() => {
        if (props.open && props.cinematic) {
            const animationGroup = generateCinematicAnimationGroup(props.cinematic, props.editor.layout.preview.scene);

            if (props.renderer.from === 0) {
                props.renderer.from = animationGroup.from;
            } else if (props.renderer.from < animationGroup.from) {
                props.renderer.from = animationGroup.from;
            }

            if (props.renderer.to === 0) {
                props.renderer.to = animationGroup.to;
            } else if (props.renderer.to > animationGroup.to) {
                props.renderer.to = animationGroup.to;
            }

            setAnimationGroup(animationGroup);
        }
    }, [props.open, props.cinematic]);

    async function handleRender() {
        if (!props.cinematic || !props.type || !animationGroup) {
            return;
        }

        const destination = saveSingleFileDialog({
            title: "Save cinematic video as...",
            filters: [
                { name: "Mpeg-4 Video", extensions: ["mp4"] },
            ],
        });

        if (!destination) {
            return;
        }

        if (
            props.renderer.from >= props.renderer.to ||
            props.renderer.to <= props.renderer.from
        ) {
            props.renderer.from = animationGroup.from;
            props.renderer.to = animationGroup.to;
        }

        animationGroup.from = props.renderer.from;
        animationGroup.to = props.renderer.to;

        setAnimationGroup(null);

        props.renderer.renderCinematic(props.cinematic, props.type, destination, animationGroup);
    }

    return (
        <AlertDialog open={props.open} onOpenChange={(o) => !o && props.onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Render cinematic
                    </AlertDialogTitle>
                    <AlertDialogDescription className="flex flex-col gap-2 py-5">
                        {/* Range */}
                        {animationGroup &&
                            <div className="flex flex-col gap-2">
                                <EditorInspectorNumberField noUndoRedo object={props.renderer} property="from" label="Start frame" step={1} min={animationGroup?.from} max={animationGroup?.to} />
                                <EditorInspectorNumberField noUndoRedo object={props.renderer} property="to" label="End frame" step={1} min={animationGroup?.from} max={animationGroup?.to} />
                            </div>
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="min-w-24" onClick={() => props.onClose()}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction className="min-w-24" onClick={() => handleRender()}>
                        Render
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

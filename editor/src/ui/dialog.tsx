import { ReactNode } from "react";
import { createRoot } from "react-dom/client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "./shadcn/ui/alert-dialog";
import { Input } from "./shadcn/ui/input";

export type DialogReturnType = {
    close: () => void;
};

export function showDialog(title: ReactNode, children: ReactNode): DialogReturnType {
    const div = document.createElement("div");
    document.body.appendChild(div);

    const root = createRoot(div);

    const returnValue = {
        close() {
            root.unmount();
            document.body.removeChild(div);
        },
    } as DialogReturnType;

    root.render(
        <AlertDialog open onOpenChange={(o) => !o && returnValue.close()}>
            <AlertDialogContent className="w-fit h-fit">
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {children}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>

                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    return returnValue;
}

export function showConfirm(title: string, children: ReactNode): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const div = document.createElement("div");
        document.body.appendChild(div);

        const root = createRoot(div);
        root.render(
            <AlertDialog open>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {children}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            root.unmount();
                            document.body.removeChild(div);
                            resolve(false);
                        }}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            root.unmount();
                            document.body.removeChild(div);
                            resolve(true);
                        }}>
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    });
};

export function showPrompt(title: string, children: ReactNode, value?: string): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
        const div = document.createElement("div");
        document.body.appendChild(div);

        let ref: HTMLInputElement | null = null;

        const root = createRoot(div);
        root.render(
            <AlertDialog open>
                <AlertDialogContent ref={(r) => {
                    if (r && ref) {
                        ref.focus();
                        ref.value = value ?? "";
                    }
                }}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {children}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <Input ref={(r) => ref = r} placeholder="Value..." />

                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            resolve(null);
                            root.unmount();
                            document.body.removeChild(div);
                        }}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            resolve(ref?.value ?? null);
                            root.unmount();
                            document.body.removeChild(div);
                        }}>
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    });
}

export function showAlert(title: ReactNode, children: ReactNode): DialogReturnType {
    const div = document.createElement("div");
    document.body.appendChild(div);

    const root = createRoot(div);

    const returnValue = {
        close() {
            root.unmount();
            document.body.removeChild(div);
        },
    } as DialogReturnType;

    root.render(
        <AlertDialog open onOpenChange={(o) => !o && returnValue.close()}>
            <AlertDialogContent className="w-fit h-fit">
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {children}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => {
                        root.unmount();
                        document.body.removeChild(div);
                    }}>
                        Ok
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    return returnValue;
}
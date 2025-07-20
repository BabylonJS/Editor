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
	wait: () => Promise<void>;
};

export function showDialog(title: ReactNode, children: ReactNode, asChild?: boolean): DialogReturnType {
	const div = document.createElement("div");
	document.body.appendChild(div);

	const root = createRoot(div);

	let _resolve: () => void;
	const promise = new Promise<void>((resolve) => {
		_resolve = resolve;
	});

	const returnValue = {
		close: () => {
			_resolve();

			root.unmount();
			document.body.removeChild(div);
		},
		wait: () => {
			return promise;
		},
	} as DialogReturnType;

	root.render(
		<AlertDialog open onOpenChange={(o) => !o && returnValue.close()}>
			<AlertDialogContent className="w-fit h-fit">
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription asChild={asChild}>{children}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter></AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);

	return returnValue;
}

export function showConfirm(
	title: string,
	children: ReactNode,
	options?: {
		cancelText?: string;
		confirmText?: string;
	}
): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		const div = document.createElement("div");
		document.body.appendChild(div);

		const root = createRoot(div);
		root.render(
			<AlertDialog open>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{title}</AlertDialogTitle>
						<AlertDialogDescription>{children}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							className="min-w-24"
							onClick={() => {
								root.unmount();
								document.body.removeChild(div);
								resolve(false);
							}}
						>
							{options?.cancelText ?? "Cancel"}
						</AlertDialogCancel>
						<AlertDialogAction
							className="min-w-24"
							onClick={() => {
								root.unmount();
								document.body.removeChild(div);
								resolve(true);
							}}
						>
							{options?.confirmText ?? "Continue"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	});
}

export function showPrompt(title: string, children: ReactNode, value?: string): Promise<string | null> {
	return new Promise<string | null>((resolve) => {
		const div = document.createElement("div");
		document.body.appendChild(div);

		let ref: HTMLInputElement | null = null;

		const root = createRoot(div);
		root.render(
			<AlertDialog open>
				<AlertDialogContent
					ref={(r) => {
						if (r && ref) {
							ref.focus();
							ref.value = value ?? "";
						}
					}}
				>
					<AlertDialogHeader>
						<AlertDialogTitle>{title}</AlertDialogTitle>
						<AlertDialogDescription>{children}</AlertDialogDescription>
					</AlertDialogHeader>

					<Input ref={(r) => (ref = r)} placeholder="Value..." />

					<AlertDialogFooter>
						<AlertDialogCancel
							onClick={() => {
								resolve(null);
								root.unmount();
								document.body.removeChild(div);
							}}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								resolve(ref?.value ?? null);
								root.unmount();
								document.body.removeChild(div);
							}}
						>
							Continue
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	});
}

export function showAlert(title: ReactNode, children: ReactNode, asChild?: boolean): DialogReturnType {
	const div = document.createElement("div");
	document.body.appendChild(div);

	const root = createRoot(div);

	let _resolve: () => void;
	const promise = new Promise<void>((resolve) => {
		_resolve = resolve;
	});

	const returnValue = {
		close: () => {
			_resolve();

			root.unmount();
			document.body.removeChild(div);
		},
		wait: () => {
			return promise;
		},
	} as DialogReturnType;

	root.render(
		<AlertDialog open>
			<AlertDialogContent className="w-fit h-fit max-w-[95vw] max-h-[95vh]">
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription asChild={asChild}>{children}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogAction onClick={() => returnValue.close()}>Continue</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);

	return returnValue;
}

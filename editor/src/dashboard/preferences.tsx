import { join } from "path";
import { pathExistsSync } from "fs-extra";

import { useEffect, useState } from "react";

import { Button } from "../ui/shadcn/ui/button";
import { Switch } from "../ui/shadcn/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/shadcn/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/shadcn/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/shadcn/ui/dialog";

import { isWindows } from "../tools/os";
import { tryGetTerminalFromLocalStorage, trySetTerminalInLocalStorage } from "../tools/local-storage";

export interface IDashboardPreferencesProps {
	isOpened: boolean;
	onClose: () => void;

	closeDashboardOnProjectOpen: boolean;
	onKeepDashboardChanged: (checked: boolean) => void;
}

export function DashboardPreferences(props: IDashboardPreferencesProps) {
	const [cmdPath, setCmdPath] = useState<string | null>(null);
	const [powerShellPath, setPowerShellPath] = useState<string | null>(null);

	const [selectedTerminal, setSelectedTerminal] = useState<string>(tryGetTerminalFromLocalStorage() ?? "");

	useEffect(() => {
		if (isWindows()) {
			const systemRoot = process.env.SystemRoot || process.env.WINDIR;
			if (systemRoot) {
				const cmdPath = join(systemRoot, "System32", "cmd.exe");
				if (pathExistsSync(cmdPath)) {
					setCmdPath(cmdPath);
				}

				const powershellPath = join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
				if (pathExistsSync(powershellPath)) {
					setPowerShellPath(powershellPath);
				}
			}
		}
	}, []);

	function handleTerminalChanged(value: string) {
		setSelectedTerminal(value);
		trySetTerminalInLocalStorage(value);
	}

	return (
		<Dialog open={props.isOpened} onOpenChange={(o) => !o && props.onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Preferences</DialogTitle>
				</DialogHeader>

				<TooltipProvider>
					<div className="flex flex-col gap-4 w-full py-4">
						<Tooltip>
							<TooltipTrigger onClick={() => props.onKeepDashboardChanged(!props.closeDashboardOnProjectOpen)}>
								<div className="flex items-center gap-4 w-full">
									<div className="text-start w-full">Close dashboard on project open</div>
									<div className="flex justify-end">
										<Switch checked={props.closeDashboardOnProjectOpen} />
									</div>
								</div>
							</TooltipTrigger>
							<TooltipContent align="end" side="top" collisionPadding={8}>
								If enabled, the dashboard will stay open when a project starts.
								<br />
								If disabled, the dashboard will close when a project starts and reopen after the project is closed.
							</TooltipContent>
						</Tooltip>

						{isWindows() && (
							<div className="flex items-center gap-4 w-full">
								<div className="w-1/3">Terminal</div>
								<Select value={selectedTerminal} onValueChange={(v) => handleTerminalChanged(v)}>
									<SelectTrigger className="w-2/3">
										<SelectValue placeholder="Choose Terminal..." />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Automatic">
											<div className="flex items-center gap-2">Automatic</div>
										</SelectItem>

										{cmdPath && (
											<SelectItem value={cmdPath}>
												<div className="flex items-center gap-2">CMD.exe</div>
											</SelectItem>
										)}
										{powerShellPath && (
											<SelectItem value={powerShellPath}>
												<div className="flex items-center gap-2">PowerShell.exe</div>
											</SelectItem>
										)}
									</SelectContent>
								</Select>
							</div>
						)}
					</div>
				</TooltipProvider>

				<DialogFooter>
					<Button variant="secondary" className="w-24" onClick={props.onClose}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

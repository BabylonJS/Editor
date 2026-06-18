import { join } from "path";
import { pathExistsSync } from "fs-extra";

import { useEffect, useState } from "react";

import { Button } from "../ui/shadcn/ui/button";
import { Switch } from "../ui/shadcn/ui/switch";
import { Separator } from "../ui/shadcn/ui/separator";
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

				<div className="flex flex-col gap-4 w-full py-4">
					<div className="flex flex-col gap-2">
						<div className="text-muted-foreground">
							If disabled, the dashboard will stay open when a project starts.
							<br />
							If enabled, the dashboard will close when a project starts and reopen after the project is closed.
						</div>
						<div className="flex items-center gap-4 w-full cursor-pointer" onClick={() => props.onKeepDashboardChanged(!props.closeDashboardOnProjectOpen)}>
							<div className="text-start w-full">Close dashboard on project open</div>
							<div className="flex justify-end">
								<Switch checked={props.closeDashboardOnProjectOpen} />
							</div>
						</div>
					</div>

					{isWindows() && (
						<>
							<Separator />

							<div className="flex flex-col gap-2">
								<div className="text-muted-foreground">
									By default, PowerShell may be used as the default terminal on Windows. PowerShell disables script execution by default which can cause issues
									using the Babylon.js Editor. You can change the default terminal to CMD to avoid these issues.
								</div>

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
							</div>
						</>
					)}
				</div>

				<DialogFooter>
					<Button variant="secondary" className="w-24" onClick={props.onClose}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

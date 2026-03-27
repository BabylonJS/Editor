import { Button } from "../../../ui/shadcn/ui/button";

import { ISketchfabSettings } from "../sketchfab";

interface ISketchfabProviderSettingsProps {
	onSettingChanged: (key: string, value: string) => void;
	settings: ISketchfabSettings;
	handleOAuthLogin: () => void;
}

export function SketchfabProviderSettings(props: ISketchfabProviderSettingsProps) {
	const isConfigured = !!process.env.SKETCHFAB_CLIENT_ID;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<p className="text-sm font-medium">Authentication</p>
				{!props.settings.token ? (
					<div className="flex flex-col gap-2">
						<Button onClick={() => props.handleOAuthLogin()} disabled={!isConfigured}>
							Login with Sketchfab
						</Button>
						{!isConfigured && <p className="text-xs text-destructive">Missing `SKETCHFAB_CLIENT_ID` configuration.</p>}
					</div>
				) : (
					<div className="flex items-center justify-between p-2 bg-muted rounded-md">
						<span className="text-xs font-medium text-green-500">Logged In</span>
						<Button size="sm" variant="outline" onClick={() => props.onSettingChanged("token", "")}>
							Logout
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}

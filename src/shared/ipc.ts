export enum IPCRequests {
	OpenWindowOnDemand = "openwindowondemand",

	OpenDirectoryDialog = "opendirectorydialog",
	OpenFileDialog = "openfiledialog",
	SaveFileDialog = "savefiledialog",

	GetProjectPath = "getprojectpath",
	SetProjectPath = "setprojectpath",

	GetWorkspacePath = "getworkspacepath",
	SetWorkspacePath = "setworkspacepath",

	StartGameServer = "startgameserver",

	SendWindowMessage = "sendwindowmessage",
	FocusWindow = "focuswindow",
	CloseWindow = "closewindow",

	EnableDevTools = "enabledevtools",
	OpenDevTools = "opendevtools",

	SetTouchBar = "settouchbar",
}

export enum IPCResponses {
	OpenWindowOnDemand = "openwindowondemand",

	CancelOpenFileDialog = "cancelopenfiledialog",
	OpenDirectoryDialog = "opendirectorydialog",
	OpenFileDialog = "openfiledialog",
	SaveFileDialog = "savefiledialog",
	CancelSaveFileDialog = "cancelsavefiledialog",

	GetProjectPath = "getprojectpath",
	SetProjectPath = "setprojectpath",

	GetWorkspacePath = "getworkspacepath",
	SetWorkspacePath = "setworkspacepath",

	StartGameServer = "startgameserver",

	SendWindowMessage = "sendwindowmessage",

	EnableDevTools = "enabledevtools",
}

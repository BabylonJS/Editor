/**
 * Defines the reference to the main class used to compute
 * the tasks in that worker. This reference is set when the caller
 * sends the require message.
 */
let workerReference: any = null;

/**
 * Listens to all messages sent by the caller.
 */
self.addEventListener("message", async (ev) => {
	if (!ev.data?.messageId) {
		return;
	}

	try {
		let result = null;

		switch (ev.data.messageId) {
			case "require":
				workerReference = new (require(ev.data.path)["default"])(...ev.data.parameters);
				break;

			case "executeFunction":
				result = await (workerReference[ev.data.fnName].apply(workerReference, ev.data.parameters));
				break;
		}

		self.postMessage({ messageId: ev.data.messageId, randomId: ev.data.randomId, result }, undefined!);
	} catch (e) {
		console.error(e);
		self.postMessage({ messageId: ev.data.messageId, randomId: ev.data.randomId, error: e?.message }, undefined!);
	}
});

/**
 * Tells the worker's caller that it has been loaded and initialized.
 */
self.postMessage("initialized", undefined!);

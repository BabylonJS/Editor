export async function checkAwaitPromises(promises: Promise<void>[], force: boolean) {
	if (promises.length >= 10 || force) {
		await Promise.all(promises);
		promises.splice(0, promises.length);
	}
}

/**
 * Opens an IndexedDB database with the given name and calls the upgradeNeeded callback if the database needs to be created or upgraded.
 * @param name The name of the database to open
 * @param upgradeNeeded The callback to call if the database needs to be created or upgraded
 */
export async function openIndexDB(name: string, upgradeNeeded: (database: IDBDatabase) => void): Promise<IDBDatabase> {
	return new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(name, 1);

		request.addEventListener("error", () => reject());
		request.addEventListener("blocked", () => reject());

		request.addEventListener("upgradeneeded", () => {
			try {
				upgradeNeeded(request.result);
			} catch (e) {
				reject(e);
			}
		});

		request.addEventListener("success", () => {
			resolve(request.result);
		});
	});
}

/**
 * Gets a value from the database for the given store and key.
 * @param database defines the database to get the value from
 * @param storeName defines the name of the store to get the value from
 * @param key defines the key of the value to get
 */
export function getFromIndexDB<T>(database: IDBDatabase, storeName: string, key: string): Promise<T | null> {
	return new Promise<T | null>((resolve) => {
		const transaction = database.transaction(storeName);
		const request = transaction.objectStore(storeName).get(key);

		request.addEventListener("error", () => {
			resolve(null);
		});

		request.addEventListener("success", () => {
			resolve(request.result ?? null);
		});
	});
}

/**
 * Puts a value in the database for the given store and key.
 * @param database defines the database to put the value in
 * @param storeName defines the name of the store to put the value in
 * @param data defines the value to put in the database
 */
export async function putInIndexDB<T>(database: IDBDatabase, storeName: string, data: T): Promise<void> {
	const versionTransation = database.transaction(storeName, "readwrite");
	const versionRequest = versionTransation.objectStore(storeName).put(data);

	await new Promise<void>((resolve, reject) => {
		versionRequest.addEventListener("error", () => reject());
		versionRequest.addEventListener("success", () => resolve());
	});
}

const objectsProxies = new Map<any, any>();

export function getProxy<T>(metadata: any, onChange: () => void): T {
	const existingProxy = objectsProxies.get(metadata);
	if (existingProxy) {
		return existingProxy;
	}

	const proxy = new Proxy(metadata, {
		get(target, prop) {
			return target[prop];
		},
		set(obj, prop, value) {
			obj[prop] = value;
			onChange();
			return true;
		},
	});

	objectsProxies.set(metadata, proxy);

	return proxy;
}

let storage = new Map();

export function publish(message, publisher, data) {
	console.log(message, publisher, data);
	if (!storage.has(message)) { return; }
	storage.get(message).forEach(listener => listener(message, publisher, data));
}

export function subscribe(message, listener) {
	if (!storage.has(message)) { storage.set(message, new Set()); }
	storage.get(message).add(listener);
}

export function unsubscribe(message, listener) {
	if (!storage.has(message)) { storage.set(message, new Set()); }
	storage.get(message).remove(listener);
}

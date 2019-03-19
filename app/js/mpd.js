import * as parser from "./parser.js";

let ws;
let commandQueue = [];
let pendingResolve;

function onMessage(e) {
	if (pendingResolve) {
		pendingResolve(JSON.parse(e.data)); // FIXME tady test na ACK
		pendingResolve = null;
	}
	processQueue();
}

function onError(e) {
	console.error(e);
	ws = null; // fixme
}

function onClose(e) {
	console.warn(e);
	ws = null; // fixme
}

function processQueue() {
	if (pendingResolve || commandQueue.length == 0) { return; }
	let cmd = commandQueue.shift();
	if (cmd instanceof Array) { cmd = ["command_list_begin", ...cmd, "command_list_end"].join("\n"); }
	ws.send(cmd);
}

export async function command(cmd) {
	commandQueue.push(cmd);
	processQueue();

	return new Promise(resolve => pendingResolve = resolve);
}

export async function getStatus() {
	let lines = await command(["status", "currentsong"]);
	return parser.linesToStruct(lines);
}

export async function init() {
	return new Promise((resolve, reject) => {
		try {
			ws = new WebSocket("ws://localhost:8080?server=0:6600");
		} catch (e) { reject(e); }
		pendingResolve = resolve;

		ws.addEventListener("error", onError);
		ws.addEventListener("message", onMessage);
		ws.addEventListener("close", onClose);
	});
}

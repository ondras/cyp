import * as parser from "./parser.js";

let ws;
let commandQueue = [];
let current;

function onMessage(e) {
	if (current) {
		let lines = JSON.parse(e.data);
		let last = lines.pop();
		if (last.startsWith("OK")) {
			current.resolve(lines);
		} else {
			current.reject(last);
		}
		current = null;
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
	if (current || commandQueue.length == 0) { return; }
	current = commandQueue.shift();
	ws.send(current.cmd);
}

export function escape(str) {
	return str.replace(/(['"\\])/g, "\\$1");
}

export async function command(cmd) {
	if (cmd instanceof Array) { cmd = ["command_list_begin", ...cmd, "command_list_end"].join("\n"); }

	return new Promise((resolve, reject) => {
		commandQueue.push({cmd, resolve, reject});
		processQueue();
	});
}

export async function commandAndStatus(cmd) {
	let lines = await command([cmd, "status", "currentsong"]);
	return parser.linesToStruct(lines);
}

export async function status() {
	let lines = await command(["status", "currentsong"]);
	return parser.linesToStruct(lines);
}

export async function listQueue() {
	let lines = await command("playlistinfo");
	return parser.songList(lines);
}

export async function init() {
	return new Promise((resolve, reject) => {
		try {
			ws = new WebSocket("ws://localhost:8080");
		} catch (e) { reject(e); }
		current = {resolve, reject};

		ws.addEventListener("error", onError);
		ws.addEventListener("message", onMessage);
		ws.addEventListener("close", onClose);
	});
}

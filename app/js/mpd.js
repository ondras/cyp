import * as parser from "./parser.js";

let ws;
let commandQueue = [];
let current;
let canTerminateIdle = false;

function onError(e) {
	console.error(e);
	current && current.reject(e);
	ws = null; // fixme
}

function onClose(e) {
	console.warn(e);
	current && current.reject(e);
	ws = null; // fixme
}

function onMessage(e) {
	if (!current) { return; }

	let lines = JSON.parse(e.data);
	let last = lines.pop();
	if (last.startsWith("OK")) {
		current.resolve(lines);
	} else {
		console.warn(last);
		current.reject(last);
	}
	current = null;

	if (commandQueue.length > 0) {
		advanceQueue();
	} else {
		setTimeout(idle, 0); // only after resolution callbacks
	}
}

function advanceQueue(){
	current = commandQueue.shift();
	ws.send(current.cmd);
}

async function idle() {
	if (current) { return; }

	canTerminateIdle = true;
	let lines = await command("idle stored_playlist playlist player options");
	canTerminateIdle = false;
	let changed = parser.linesToStruct(lines).changed || [];
	changed = [].concat(changed);
	if (changed.length > 0) {
		// FIXME not on window
		window.dispatchEvent(new CustomEvent("idle-change", {detail:changed}));
	}
}

export async function command(cmd) {
	if (cmd instanceof Array) { cmd = ["command_list_begin", ...cmd, "command_list_end"].join("\n"); }

	return new Promise((resolve, reject) => {
		commandQueue.push({cmd, resolve, reject});

		if (!current) {
			advanceQueue();
		} else if (canTerminateIdle) {
			ws.send("noidle");
			canTerminateIdle = false;
		}
	});
}

export async function commandAndStatus(...args) {
	args.push("status");
	let lines = await command(args);
	return parser.linesToStruct(lines);
}

export async function status() {
	let lines = await command("status");
	return parser.linesToStruct(lines);
}

export async function currentSong() {
	let lines = await command("currentsong");
	return parser.linesToStruct(lines);
}

export async function listQueue() {
	let lines = await command("playlistinfo");
	return parser.songList(lines);
}

export async function listPlaylists() {
	let lines = await command("listplaylists");
	let parsed = parser.linesToStruct(lines);

	let list = parsed["playlist"];
	if (!list) { return []; }
	return (list instanceof Array ? list : [list]);
}

export async function listPath(path) {
	let lines = await command(`lsinfo "${escape(path)}"`);
	return parser.pathContents(lines);
}

export async function listTags(tag, filter = {}) {
	let tokens = ["list", tag];
	if (Object.keys(filter).length) {
		tokens.push(serializeFilter(filter));

		let fakeGroup = Object.keys(filter)[0]; // FIXME hack for MPD < 0.21.6
		tokens.push("group", fakeGroup);
	}
	let lines = await command(tokens.join(" "));
	let parsed = parser.linesToStruct(lines);
	return [].concat(tag in parsed ? parsed[tag] : []);
}

export async function listSongs(filter, window = null) {
	let tokens = ["find", serializeFilter(filter)];
	window && tokens.push("window", window.join(":"));
	let lines = await command(tokens.join(" "));
	return parser.songList(lines);
}

export async function searchSongs(filter) {
	let tokens = ["search", serializeFilter(filter, "contains")];
	let lines = await command(tokens.join(" "));
	return parser.songList(lines);
}

export async function albumArt(songUrl) {
	let data = [];
	let offset = 0;
	let params = ["albumart", `"${escape(songUrl)}"`, offset];

	while (1) {
		params[2] = offset;
		try {
			let lines = await command(params.join(" "));
			data = data.concat(lines[2]);
			let metadata = parser.linesToStruct(lines.slice(0, 2));
			if (data.length >= Number(metadata["size"])) { return data; }
			offset += Number(metadata["binary"]);
		} catch (e) { return null; }
	}
	return null;
}

export function serializeFilter(filter, operator = "==") {
	let tokens = ["("];
	Object.entries(filter).forEach(([key, value], index) => {
		index && tokens.push(" AND ");
		tokens.push(`(${key} ${operator} "${escape(value)}")`);
	});
	tokens.push(")");

	let filterStr = tokens.join("");
	return `"${escape(filterStr)}"`;
}

export function escape(str) {
	return str.replace(/(['"\\])/g, "\\$1");
}

export async function init() {
	let response = await fetch("/ticket", {method:"POST"});
	let ticket = (await response.json()).ticket;

	let resolve, reject;
	let promise = new Promise((res, rej) => {
		resolve = res;
		reject = rej;

		try {
			let url = new URL(location.href);
			url.protocol = "ws";
			url.hash = "";
			url.searchParams.set("ticket", ticket);
			ws = new WebSocket(url.href);
		} catch (e) { reject(e); }

		ws.addEventListener("error", onError);
		ws.addEventListener("message", onMessage);
		ws.addEventListener("close", onClose);
	});

	current = {resolve, reject, promise};
	return Promise;
}

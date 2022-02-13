import * as parser from "./parser.js";


export default class MPD {
	static async connect() {
		let response = await fetch("ticket", {method:"POST"});
		let ticket = (await response.json()).ticket;

		let ws = new WebSocket(createURL(ticket).href);

		return new Promise((resolve, reject) => {
			let mpd;
			let initialCommand = {resolve: () => resolve(mpd), reject};
			mpd = new this(ws, initialCommand);
		});
	}

	constructor(/** @type WebSocket */ ws, initialCommand) {
		this._ws = ws;
		this._queue = [];
		this._current = initialCommand;
		this._canTerminateIdle = false;

		ws.addEventListener("message", e => this._onMessage(e));
		ws.addEventListener("close", e => this._onClose(e));
	}

	onClose(_e) {}
	onChange(_changed) {}

	command(cmd) {
		if (cmd instanceof Array) { cmd = ["command_list_begin", ...cmd, "command_list_end"].join("\n"); }

		return new Promise((resolve, reject) => {
			this._queue.push({cmd, resolve, reject});

			if (!this._current) {
				this._advanceQueue();
			} else if (this._canTerminateIdle) {
				this._ws.send("noidle");
				this._canTerminateIdle = false;
			}
		});
	}

	async status() {
		let lines = await this.command("status");
		return parser.linesToStruct(lines);
	}

	async currentSong() {
		let lines = await this.command("currentsong");
		return parser.linesToStruct(lines);
	}

	async listQueue() {
		let lines = await this.command("playlistinfo");
		return parser.songList(lines);
	}

	async listPlaylists() {
		let lines = await this.command("listplaylists");
		let parsed = parser.linesToStruct(lines);

		let list = parsed["playlist"];
		if (!list) { return []; }
		return (list instanceof Array ? list : [list]);
	}

	async listPath(path) {
		let lines = await this.command(`lsinfo "${escape(path)}"`);
		return parser.pathContents(lines);
	}

	async listTags(tag, filter = {}) {
		let tokens = ["list", tag];
		if (Object.keys(filter).length) {
			tokens.push(serializeFilter(filter));

			let fakeGroup = Object.keys(filter)[0]; // FIXME hack for MPD < 0.21.6
			tokens.push("group", fakeGroup);
		}
		let lines = await this.command(tokens.join(" "));
		let parsed = parser.linesToStruct(lines);
		return [].concat(tag in parsed ? parsed[tag] : []);
	}

	async listSongs(filter, window = null) {
		let tokens = ["find", serializeFilter(filter)];
		window && tokens.push("window", window.join(":"));
		let lines = await this.command(tokens.join(" "));
		return parser.songList(lines);
	}

	async searchSongs(filter) {
		let tokens = ["search", serializeFilter(filter, "contains")];
		let lines = await this.command(tokens.join(" "));
		return parser.songList(lines);
	}

	async albumArt(songUrl) {
		let data = [];
		let offset = 0;
		let params = ["albumart", `"${escape(songUrl)}"`, offset];

		while (1) {
			params[2] = offset;
			try {
				let lines = await this.command(params.join(" "));
				data = data.concat(lines[2]);
				let metadata = parser.linesToStruct(lines.slice(0, 2));
				if (data.length >= Number(metadata["size"])) { return data; }
				offset += Number(metadata["binary"]);
			} catch (e) { return null; }
		}
		return null;
	}

	escape(...args) { return escape(...args); }

	_onMessage(e) {
		if (!this._current) { return; }

		let lines = JSON.parse(e.data);
		let last = lines.pop();
		if (last.startsWith("OK")) {
			this._current.resolve(lines);
		} else {
			console.warn(last);
			this._current.reject(last);
		}
		this._current = null;

		if (this._queue.length > 0) {
			this._advanceQueue();
		} else {
			setTimeout(() => this._idle(), 0); // only after resolution callbacks
		}
	}

	_onClose(e) {
		console.warn(e);
		this._current && this._current.reject(e);
		this._ws = null;
		this.onClose(e);
	}

	_advanceQueue() {
		this._current = this._queue.shift();
		this._ws.send(this._current.cmd);
	}

	async _idle() {
		if (this._current) { return; }

		this._canTerminateIdle = true;
		let lines = await this.command("idle stored_playlist playlist player options mixer");
		this._canTerminateIdle = false;
		let changed = parser.linesToStruct(lines).changed || [];
		changed = [].concat(changed);
		(changed.length > 0) && this.onChange(changed);
	}
}


export function escape(str) {
	return str.replace(/(['"\\])/g, "\\$1");
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

function createURL(ticket) {
	let url = new URL(location.href);
	url.protocol = ( url.protocol == 'https:' ? "wss" : "ws" );
	url.hash = "";
	url.searchParams.set("ticket", ticket);
	return url;
}

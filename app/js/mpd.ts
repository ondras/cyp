import * as parser from "./parser.js";
import { TagFilter } from "./elements/tag.js";


interface Command {
	cmd: string;
	resolve: (lines: string[]) => void;
	reject: (line: string | CloseEvent) => void;
}

export default class MPD {
	protected queue: Command[] = [];
	protected current?: Command;
	protected canTerminateIdle = false;

	static async connect() {
		let response = await fetch("ticket", {method:"POST"});
		let ticket = (await response.json()).ticket;

		let ws = new WebSocket(createURL(ticket).href);

		return new Promise<MPD>((resolve, reject) => {
			let mpd: MPD;
			let initialCommand = {resolve: () => resolve(mpd), reject, cmd:""};
			mpd = new this(ws, initialCommand);
		});
	}

	constructor(protected ws: WebSocket, initialCommand: Command) {
		this.current = initialCommand;

		ws.addEventListener("message", e => this._onMessage(e));
		ws.addEventListener("close", e => this._onClose(e));
	}

	onClose(e: CloseEvent) {}
	onChange(changed: string[]) {}

	command(cmds: string | string[]) {
		let cmd = (cmds instanceof Array ? ["command_list_begin", ...cmds, "command_list_end"].join("\n") : cmds);

		return new Promise<string[]>((resolve, reject) => {
			this.queue.push({cmd, resolve, reject});

			if (!this.current) {
				this.advanceQueue();
			} else if (this.canTerminateIdle) {
				this.ws.send("noidle");
				this.canTerminateIdle = false;
			}
		});
	}

	async status() {
		let lines = await this.command("status");
		return parser.linesToStruct(lines) as parser.StatusData;
	}

	async currentSong() {
		let lines = await this.command("currentsong");
		return parser.linesToStruct<parser.SongData>(lines);
	}

	async listQueue() {
		let lines = await this.command("playlistinfo");
		return parser.songList(lines);
	}

	async listPlaylists() {
		interface Result {
			playlist: string | string[];
		}
		let lines = await this.command("listplaylists");
		let parsed = parser.linesToStruct<Result>(lines);

		let list = parsed.playlist;
		if (!list) { return []; }
		return (list instanceof Array ? list : [list]);
	}

	async listPlaylistItems(name: string) {
		let lines = await this.command(`listplaylistinfo "${escape(name)}"`);
		return parser.songList(lines);
	}

	async listPath(path: string) {
		let lines = await this.command(`lsinfo "${escape(path)}"`);
		return parser.pathContents(lines);
	}

	async listTags(tag: string, filter: TagFilter = {}) {
		let tokens = ["list", tag];
		if (Object.keys(filter).length) {
			tokens.push(serializeFilter(filter));

			let fakeGroup = Object.keys(filter)[0]; // FIXME hack for MPD < 0.21.6
			tokens.push("group", fakeGroup);
		}
		let lines = await this.command(tokens.join(" "));
		let parsed = parser.linesToStruct(lines);
		return ([] as string[]).concat(tag in parsed ? parsed[tag] : []);
	}

	async listSongs(filter: TagFilter, window?: number[]) {
		let tokens = ["find", serializeFilter(filter)];
		window && tokens.push("window", window.join(":"));
		let lines = await this.command(tokens.join(" "));
		return parser.songList(lines);
	}

	async searchSongs(filter: TagFilter) {
		let tokens = ["search", serializeFilter(filter, "contains")];
		let lines = await this.command(tokens.join(" "));
		return parser.songList(lines);
	}

	async albumArt(songUrl: string) {
		let data: number[] = [];
		let offset = 0;
		let params = ["albumart", `"${escape(songUrl)}"`, offset];

		interface Metadata {
			size: string;
			binary: string;
		}

		while (1) {
			params[2] = offset;
			try {
				let lines = await this.command(params.join(" "));
				data = data.concat(lines[2] as unknown as number[]); // !
				let metadata = parser.linesToStruct<Metadata>(lines.slice(0, 2));
				if (data.length >= Number(metadata.size)) { return data; }
				offset += Number(metadata.binary);
			} catch (e) { return null; }
		}
		return null;
	}

	_onMessage(e: MessageEvent) {
		if (!this.current) { return; }

		let lines = JSON.parse(e.data);
		let last = lines.pop();
		if (last.startsWith("OK")) {
			this.current.resolve(lines);
		} else {
			console.warn(last);
			this.current.reject(last);
		}
		this.current = undefined;

		if (this.queue.length > 0) {
			this.advanceQueue();
		} else {
			setTimeout(() => this.idle(), 0); // only after resolution callbacks
		}
	}

	_onClose(e: CloseEvent) {
		console.warn(e);
		this.current && this.current.reject(e);
		this.onClose(e);
	}

	protected advanceQueue() {
		this.current = this.queue.shift()!;
		this.ws.send(this.current.cmd);
	}

	protected async idle() {
		if (this.current) { return; }

		interface Result {
			changed?: string | string[]
		}

		this.canTerminateIdle = true;
		let lines = await this.command("idle stored_playlist playlist player options mixer");
		this.canTerminateIdle = false;
		let changed = parser.linesToStruct<Result>(lines).changed || [];
		changed = ([] as string[]).concat(changed);
		(changed.length > 0) && this.onChange(changed);
	}
}

export function escape(str: string) {
	return str.replace(/(['"\\])/g, "\\$1");
}

export function serializeFilter(filter: TagFilter, operator = "==") {
	let tokens = ["("];
	Object.entries(filter).forEach(([key, value], index) => {
		index && tokens.push(" AND ");
		tokens.push(`(${key} ${operator} "${escape(value)}")`);
	});
	tokens.push(")");

	let filterStr = tokens.join("");
	return `"${escape(filterStr)}"`;
}

function createURL(ticket: string) {
	let url = new URL(location.href);
	url.protocol = ( url.protocol == 'https:' ? "wss" : "ws" );
	url.hash = "";
	url.searchParams.set("ticket", ticket);
	return url;
}

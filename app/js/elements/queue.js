import * as html from "../html.js";
import Component from "../component.js";
import Song from "./song.js";
import { escape } from "../mpd.js";


function generateMoveCommands(items, diff, all) {
	const COMPARE = (a, b) => all.indexOf(a) - all.indexOf(b);

	return items.sort(COMPARE)
		.map(item => {
			let index = all.indexOf(item) + diff;
			if (index < 0 || index >= all.length) { return null; } // this does not move
			return `moveid ${item.songId} ${index}`;
		})
		.filter(command => command);
}

class Queue extends Component {
	constructor() {
		super({selection:"multi"});
		this._currentId = null;
		this._initCommands();
	}

	handleEvent(e) {
		switch (e.type) {
			case "song-change":
				this._currentId = e.detail["Id"];
				this._updateCurrent();
			break;

			case "queue-change":
				this._sync();
			break;
		}
	}

	_onAppLoad() {
		this._app.addEventListener("song-change", this);
		this._app.addEventListener("queue-change", this);
		this._sync();
	}

	_onComponentChange(c, isThis) {
		this.hidden = !isThis;

		isThis && this._sync();
	}

	async _sync() {
		let songs = await this._mpd.listQueue();
		this._buildSongs(songs);

		// FIXME pubsub?
		document.querySelector("#queue-length").textContent = `(${songs.length})`;
	}

	_updateCurrent() {
		Array.from(this.children).forEach(/** @param {HTMLElement} node */ node => {
			node.classList.toggle("current", node.songId == this._currentId);
		});
	}

	_buildSongs(songs) {
		html.clear(this);
		this.selection.clear();

		songs.forEach(song => {
			const node = new Song(song);
			this.appendChild(node);

			node.addButton("play", async _ => {
				await this._mpd.command(`playid ${node.songId}`);
			});
		});

		this._updateCurrent();
	}

	_initCommands() {
		const sel = this.selection;

		sel.addCommandAll();

		sel.addCommand(async items => {
			const commands = generateMoveCommands(items, -1, Array.from(this.children));
			await this._mpd.command(commands);
			this._sync();
		}, {label:"Up", icon:"arrow-up-bold"});

		sel.addCommand(async items => {
			const commands = generateMoveCommands(items, +1, Array.from(this.children));
			await this._mpd.command(commands.reverse()); // move last first
			this._sync();
		}, {label:"Down", icon:"arrow-down-bold"});

		sel.addCommand(async items => {
			let name = prompt("Save selected songs as a playlist?", "name");
			if (name === null) { return; }

			name = escape(name);
			const commands = items.map(item => {
				return `playlistadd "${name}" "${escape(item.file)}"`;
			});

			await this._mpd.command(commands); // FIXME notify?
		}, {label:"Save", icon:"content-save"});

		sel.addCommand(async items => {
			if (!confirm(`Remove these ${items.length} songs from the queue?`)) { return; }

			const commands = items.map(item => `deleteid ${item.songId}`);
			await this._mpd.command(commands);

			this._sync();
		}, {label:"Remove", icon:"delete"});

		sel.addCommandCancel();
	}
}

customElements.define("cyp-queue", Queue);

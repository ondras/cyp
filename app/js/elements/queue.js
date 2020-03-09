import * as html from "../html.js";
import Component from "../component.js";
import Song from "./song.js";

class Queue extends Component {
	constructor() {
		super();
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
		this.selection.clear();
		let songs = await this._mpd.listQueue();
		this._buildSongs(songs);

		// FIXME pubsub?
		document.querySelector("#queue-length").textContent = `(${songs.length})`;
	}

	_updateCurrent() {
		Array.from(this.children).forEach(/** @param {HTMLElement} node */ node => {
			node.classList.toggle("current", node.dataset.songId == this._currentId);
		});
	}

	_buildSongs(songs) {
		html.clear(this);

		songs.forEach(song => this.appendChild(new Song(song)));

		this._updateCurrent();
	}

	_initCommands() {
		const sel = this.selection;

		sel.addCommandAll();

		sel.addCommand(async items => {
			let name = prompt("Save selected songs as a playlist?", "name");
			if (name === null) { return; }

			name = this._mpd.escape(name);
			const commands = items.map(item => {
				return `playlistadd "${name}" "${this._mpd.escape(item.data["file"])}"`;
			});

			await this._mpd.command(commands);
			// FIXME notify?
		}, {label:"Save", icon:"content-save"});

		sel.addCommand(async items => {
			if (!confirm(`Remove these ${items.length} songs from the queue?`)) { return; }

			const commands = items.map(item => `deleteid ${item.data["Id"]}`);
			await this._mpd.command(commands);

			this._sync();
		}, {label:"Remove", icon:"delete"});

		sel.addCommandClear();
	}
}

customElements.define("cyp-queue", Queue);

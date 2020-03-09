import * as html from "./lib/html.js";
import * as format from "./lib/format.js";

import Component, { HasApp } from "./component.js";

class Queue extends Component {
	constructor() {
		super();
		this._currentId = null;
/*
		this.querySelector(".clear").addEventListener("click", async _ => {
			await this._mpd.command("clear");
			this._sync();
		});

		this.querySelector(".save").addEventListener("click", _ => {
			let name = prompt("Save current queue as a playlist?", "name");
			if (name === null) { return; }
			this._mpd.command(`save "${this._mpd.escape(name)}"`);
		});
*/
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
			node.classList.toggle("current", node.dataset.songId == this._currentId);
		});
	}

	_buildSongs(songs) {
		html.clear(this);

		songs.forEach(song => this.appendChild(new Song(song)));

		this._updateCurrent();
	}
}

customElements.define("cyp-queue", Queue);

class Item extends HasApp {
	constructor() {
		super();
		this.addEventListener("click", e => this.parentNode.selection.toggle(this));
	}
}

class Song extends Item {
	constructor(data) {
		super();
		this._data = data;
		this.dataset.songId = data["Id"];
	}

	connectedCallback() {
		let info = html.node("div", {className:"info"}, "", this);

		let lines = formatSongInfo(this._data);
		html.node("h2", {}, lines.shift(), info);
		lines.length && html.node("div", {}, lines.shift(), info);

/*
				playButton(TYPE_ID, id, node);
				deleteButton(TYPE_ID, id, node);
*/
		}
}

customElements.define("cyp-song", Song);


// FIXME vyfaktorovat nekam do haje
function formatSongInfo(data) {
	let lines = [];
	let tokens = [];

	if (data["Title"]) {
		tokens.push(data["Title"]);
		lines.push(tokens.join(" "));
		lines.push(format.subtitle(data));
	} else {
		lines.push(fileName(data));
		lines.push("\u00A0");
	}

	return lines;
}

// FIXME vyfaktorovat nekam do haje
function fileName(data) {
	return data["file"].split("/").pop();
}


import * as html from "./lib/html.js";
import * as ui from "./lib/ui.js";

import Component from "./component.js";

class Queue extends Component {
	constructor() {
		super();
		this._currentId = null;

		this.querySelector(".clear").addEventListener("click", async _ => {
			await this._mpd.command("clear");
			this._sync();
		});

		this.querySelector(".save").addEventListener("click", _ => {
			let name = prompt("Save current queue as a playlist?", "name");
			if (name === null) { return; }
			this._mpd.command(`save "${this._mpd.escape(name)}"`);
		});
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
		Array.from(this.querySelectorAll("[data-song-id]")).forEach(/** @param {HTMLElement} node */ node => {
			node.classList.toggle("current", node.dataset.songId == this._currentId);
		});
	}

	_buildSongs(songs) {
		let ul = this.querySelector("ul");
		html.clear(ul);

		songs.map(song => ui.song(ui.CTX_QUEUE, song, ul));

		this._updateCurrent();
	}
}

customElements.define("cyp-queue", Queue);

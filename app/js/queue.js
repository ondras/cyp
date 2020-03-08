import * as html from "./lib/html.js";
import * as ui from "./lib/ui.js";

import Component from "./component.js";

class Queue extends Component {
	constructor() {
		super();
		this._currentId = null;

		this.querySelector(".clear").addEventListener("click", async _ => {
			const mpd = await this._mpd;
			await mpd.command("clear");
			this._sync();
		});

		this.querySelector(".save").addEventListener("click", async _ => {
			let name = prompt("Save current queue as a playlist?", "name");
			if (name === null) { return; }
			const mpd = await this._mpd;
			mpd.command(`save "${mpd.escape(name)}"`);
		});

		this._app.then(app => {
			app.addEventListener("song-change", this);
			app.addEventListener("queue-change", this);
		})
		this._sync();
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

	_onComponentChange(c, isThis) {
		this.hidden = !isThis;

		isThis && this._sync();
	}

	async _sync() {
		const mpd = await this._mpd;
		let songs = await mpd.listQueue();
		this._buildSongs(songs);

		// FIXME pubsub?
		document.querySelector("#queue-length").textContent = `(${songs.length})`;
	}

	_updateCurrent() {
		let all = Array.from(this.querySelectorAll("[data-song-id]"));
		all.forEach(node => {
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

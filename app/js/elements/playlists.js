import * as html from "../html.js";
import * as ui from "../ui.js";

import Component from "../component.js";
import Playlist from "./playlist.js";


class Playlists extends Component {
	handleEvent(e) {
		switch (e.type) {
			case "playlists-change":
				this._sync();
			break;
		}
	}

	_onAppLoad() {
		this._app.addEventListener("playlists-change", this);
	}

	_onComponentChange(c, isThis) {
		this.hidden = !isThis;
		if (isThis) { this._sync(); }
	}

	async _sync() {
		let lists = await this._mpd.listPlaylists();
		this._buildLists(lists);
	}

	_buildLists(lists) {
		html.clear(this);

		lists.forEach(name => this.appendChild(new Playlist(name)));
	}
}

customElements.define("cyp-playlists", Playlists);

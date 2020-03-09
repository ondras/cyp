import * as html from "./lib/html.js";
import * as ui from "./lib/ui.js";

import Component from "./component.js";


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
		let ul = this.querySelector("ul");
		html.clear(ul);

		lists.map(list => ui.playlist(list, ul));
	}
}

customElements.define("cyp-playlists", Playlists);

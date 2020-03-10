import * as html from "../html.js";
import Component from "../component.js";
import Playlist from "./playlist.js";


class Playlists extends Component {
	constructor() {
		super({selection:"single"});
		this._initCommands();
	}

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
		this.selection.clear();

		lists.forEach(name => this.appendChild(new Playlist(name)));
	}

	_initCommands() {
		const sel = this.selection;

		sel.addCommand(async items => {
		}, {label:"Play", icon:"play"});

		sel.addCommand(async items => {
		}, {label:"Enqueue", icon:"plus"});

		sel.addCommand(async items => {
		}, {label:"Delete", icon:"delete"});

		sel.addCommandCancel();
	}
}

customElements.define("cyp-playlists", Playlists);

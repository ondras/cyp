import * as html from "../html.js";
import Component from "../component.js";
import Playlist from "./playlist.js";
import { escape } from "../mpd.js";

class Playlists extends Component {
	constructor() {
		super({selection:"single"});
		this._initCommands();
	}

	handleEvent(e) {
		switch (e.type) {
			case "idle-change":
				e.detail.includes("stored_playlist") && this._sync();
			break;
		}
	}

	_onAppLoad() {
		this._app.addEventListener("idle-change", this);
		this._sync();
	}

	_onComponentChange(c, isThis) {
		this.hidden = !isThis;
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

		sel.addCommand(async item => {
			const name = item.name;
			const commands = ["clear", `load "${escape(name)}"`, "play"];
			await this._mpd.command(commands);
			this.selection.clear(); // fixme notification?
		}, {label:"Play", icon:"play"});

		sel.addCommand(async item => {
			const name = item.name;
			await this._mpd.command(`load "${escape(name)}"`);
			this.selection.clear(); // fixme notification?
		}, {label:"Enqueue", icon:"plus"});

		sel.addCommand(async item => {
			const name = item.name;
			if (!confirm(`Really delete playlist '${name}'?`)) { return; }

			await this._mpd.command(`rm "${escape(name)}"`);
		}, {label:"Delete", icon:"delete"});

		sel.addCommandCancel();
	}
}

customElements.define("cyp-playlists", Playlists);

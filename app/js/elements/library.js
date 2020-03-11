import * as html from "../html.js";
import Component from "../component.js";
import Artist from "./artist.js";


class Library extends Component {
	constructor() {
		super({selection:"multi"});
	}

	_onAppLoad() {
		this._showRoot();
	}

	_onComponentChange(c, isThis) {
		const wasHidden = this.hidden;
		this.hidden = !isThis;

		if (!wasHidden) { this._showRoot(); }
	}

	_showRoot() {
		html.clear(this);

		html.button({icon:"artist"}, "Artists and albums", this)
			.addEventListener("click", _ => this._listTags("AlbumArtist"));

			html.button({icon:"folder"}, "Files and directories", this)
			.addEventListener("click", _ => this._listFS(""));

			html.button({icon:"magnify"}, "Search", this)
			.addEventListener("click", _ => this._showSearch());
	}

	async _listTags(tag, filter = {}) {
		const values = await this._mpd.listTags(tag, filter);

		html.clear(this);

		values.forEach(value => this._buildTagValue(tag, value));
	}

	async _listFS(path) {

	}

	_showSearch() {

	}

	_buildTagValue(tag, value) {
		let node;
		switch (tag) {
			case "AlbumArtist":
				node = new Artist(value);
				node.onClick = () => this._listTags("Album", {[tag]:value});
			break;
		}
		this.appendChild(node);
	}
}

customElements.define("cyp-library", Library);

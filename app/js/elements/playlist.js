import * as html from "../html.js";
import { Item } from "../component.js";

export default class Playlist extends Item {
	constructor(name) {
		super();
		this.name = name;
	}

	connectedCallback() {
		html.icon("playlist-music", this);
		this._buildTitle(this.name);
	}
}

customElements.define("cyp-playlist", Playlist);

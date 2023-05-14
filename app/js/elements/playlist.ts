import * as html from "../html.js";
import Item from "../item.js";


export default class Playlist extends Item {
	constructor(readonly name: string) {
		super();
		this.name = name;
	}

	connectedCallback() {
		html.icon("playlist-music", this);
		this.buildTitle(this.name);
	}
}

customElements.define("cyp-playlist", Playlist);

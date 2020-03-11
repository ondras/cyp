import * as html from "../html.js";
import Item from "../item.js";


export default class Artist extends Item {
	constructor(name) {
		super();
		this.name = name;
	}

	connectedCallback() {
		html.icon("artist", this);
		this._buildTitle(this.name);
	}
}

customElements.define("cyp-artist", Artist);

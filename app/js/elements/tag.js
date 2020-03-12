import * as html from "../html.js";
import Item from "../item.js";

const ICONS = {
	"AlbumArtist": "artist",
	"Album": "album"
}


export default class Tag extends Item {
	constructor(type, value, filter) {
		super();
		this._type = type;
		this._value = value;
		this._filter = filter;
	}

	connectedCallback() {
		const icon = ICONS[this._type];
		html.icon(icon, this);
		this._buildTitle(this._value);
	}

	createChildFilter() {
		return Object.assign({[this._type]:this._value}, this._filter);
	}
}

customElements.define("cyp-tag", Tag);

import Item from "../item.js";
import * as html from "../html.js";
import * as format from "../format.js";


export default class Path extends Item {
	constructor(data) {
		super();
		this._data = data;
		this._isDirectory = ("directory" in this._data);
	}

	get file() { return (this._isDirectory ? this._data["directory"] : this._data["file"]); }

	connectedCallback() {
		this.appendChild(html.icon(this._isDirectory ? "folder" : "music"));
		this._buildTitle(format.fileName(this.file));
	}
}

customElements.define("cyp-path", Path);

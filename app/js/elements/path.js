import Item from "../item.js";
import * as html from "../html.js";


function baseName(path) {
	return path.split("/").pop();
}

export default class Path extends Item {
	constructor(data) {
		super();
		this._data = data;

		if ("directory" in this._data) {
			this.file = data["directory"];
		} else {
			this.file = data["file"];
		}
	}
	connectedCallback() {
		if ("directory" in this._data) {
			this.appendChild(html.icon("folder"));
		} else {
			this.appendChild(html.icon("music"));
		}
		this._buildTitle(baseName(this.file));
	}
}

customElements.define("cyp-path", Path);

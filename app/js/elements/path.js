import Item from "../item.js";
import * as html from "../html.js";


function baseName(path) {
	return path.split("/").pop();
}

export default class Path extends Item {
	constructor(data) {
		super();
		this.data = data;
		// FIXME spis ._data a .url
	}
	connectedCallback() {
		let path;
		if ("directory" in this.data) {
			this.appendChild(html.icon("folder"));
			path = this.data["directory"];
		} else {
			this.appendChild(html.icon("music"));
			path = this.data["file"];
		}
		this._buildTitle(path);
	}
}

customElements.define("cyp-path", Path);

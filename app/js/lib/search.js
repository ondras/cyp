import * as html from "./html.js";

export function normalize(str) {
	// FIXME diac/translit
	return str.toLowerCase();
}  

export default class Search extends EventTarget {
	constructor(parent) {
		super();
		this._node = html.node("div", {className:"search"});
		let icon = html.icon("magnify", this._node);
	}

	getNode() { return this._node; }

	getValue() { return this._input.value; }

	reset() { this._input.value = ""; }
}

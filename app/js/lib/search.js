import * as html from "./html.js";

const OPEN = "open";

export function normalize(str) {
	// FIXME diac/translit
	return str.toLowerCase();
}  

export default class Search extends EventTarget {
	constructor(parent) {
		super();
		this._node = html.node("label", {className:"search"});

		this._input = html.node("input", {type:"text"}, "", this._node);
		html.icon("magnify", this._node);

		this._node.addEventListener("click", e => {
			if (e.target == this._input) { return; }
			if (this._node.classList.contains(OPEN)) {
				this.reset()
			} else {
				this._node.classList.add(OPEN);
			}
		});
	}

	getNode() { return this._node; }

	getValue() { return this._input.value; }

	reset() {
		this._input.value = "";
		this._node.classList.remove(OPEN);
	}
}

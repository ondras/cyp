import * as html from "./html.js";
import * as conf from "./conf.js";

const OPEN = "open";
const collator = new Intl.Collator(conf.locale, {usage:"search", sensitivity:"base"});

export default class Search extends EventTarget {
	constructor(parent) {
		super();
		this._node = html.node("label", {className:"search"});

		this._input = html.node("input", {type:"text"}, "", this._node);
		html.icon("magnify", this._node);

		this._node.addEventListener("click", e => {
			if (e.target == this._input) { return; }
			if (this._node.classList.contains(OPEN)) {
				this.reset();
				this.dispatchEvent(new Event("input"));
			} else {
				this._node.classList.add(OPEN);
			}
		});

		this._input.addEventListener("input", e => {
			this.dispatchEvent(new Event("input"));
		});
	}

	getNode() { return this._node; }

	match(str) {
		let q = this._input.value.trim();
		if (!q) { return true; }
		let len = q.length;
		return str.split(" ").some(str => collator.compare(q, str.substring(0, len)) == 0);
	}

	reset() {
		this._input.value = "";
		this._node.classList.remove(OPEN);
	}
}

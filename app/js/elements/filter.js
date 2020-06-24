import * as html from "../html.js";


const SELECTOR = ["cyp-tag", "cyp-path", "cyp-song"].join(", ");

export default class Filter extends HTMLElement {
	constructor() {
		super();
		this._built = false;
	}

	get value() { return this._input.value.trim(); }
	set value(value) { this._input.value = value; }
	get _input() { return this.querySelector("input"); }

	connectedCallback() {
		if (this._built) { return; }

		html.node("input", {type:"text"}, "", this);
		html.icon("filter-variant", this);

		this._input.addEventListener("input", e => this._apply());
		this._built = true;
	}

	_apply() {
		let value = this.value.toLowerCase();
		let all = [...this.parentNode.querySelectorAll(SELECTOR)];
		all.forEach(item => item.hidden = !item.matchPrefix(value));
	}
}

customElements.define("cyp-filter", Filter);

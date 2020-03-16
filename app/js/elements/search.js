import * as html from "../html.js";

export default class Search extends HTMLElement {
	constructor() {
		super();
		this._built = false;
	}

	get value() { return this._input.value.trim(); }
	set value(value) { this._input.value = value; }
	get _input() { return this.querySelector("input"); }

	onSubmit() {}
	focus() { this._input.focus(); }
	pending(pending) { this.classList.toggle("pending", pending); }

	connectedCallback() {
		if (this._built) { return; }

		const form = html.node("form", {}, "", this);
		html.node("input", {type:"text"}, "", form);
		html.button({icon:"magnify"}, "", form);

		form.addEventListener("submit", e => {
			e.preventDefault();
			this.onSubmit();
		});

		this._built = true;
	}
}

customElements.define("cyp-search", Search);
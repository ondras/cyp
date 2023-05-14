import * as html from "../html.js";


export default class Search extends HTMLElement {
	protected built = false;

	get value() { return this.input.value.trim(); }
	set value(value) { this.input.value = value; }
	protected get input() { return this.querySelector<HTMLInputElement>("input")!; }

	onSubmit() {}
	focus() { this.input.focus(); }
	pending(pending: boolean) { this.classList.toggle("pending", pending); }

	connectedCallback() {
		if (this.built) { return; }

		const form = html.node("form", {}, "", this);
		html.node("input", {type:"text"}, "", form);
		html.button({icon:"magnify"}, "", form);

		form.addEventListener("submit", e => {
			e.preventDefault();
			this.onSubmit();
		});

		this.built = true;
	}
}

customElements.define("cyp-search", Search);

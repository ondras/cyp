import * as html from "../html.js";
import Item from "../item.js";


const SELECTOR = ["cyp-tag", "cyp-path", "cyp-song"].join(", ");

export default class Filter extends HTMLElement {
	protected built = false;

	get value() { return this.input.value.trim(); }
	set value(value) { this.input.value = value; }
	protected get input() { return this.querySelector<HTMLInputElement>("input")!; }

	connectedCallback() {
		if (this.built) { return; }

		html.node("input", {type:"text"}, "", this);
		html.icon("filter-variant", this);

		this.input.addEventListener("input", e => this.apply());
		this.built = true;
	}

	protected apply() {
		let value = this.value.toLowerCase();
		let all = [...this.parentNode!.querySelectorAll<Item>(SELECTOR)];
		all.forEach(item => item.hidden = !item.matchPrefix(value));
	}
}

customElements.define("cyp-filter", Filter);

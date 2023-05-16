import * as html from "../html.js";
import Item from "../item.js";


const SELECTOR = ["cyp-tag", "cyp-path", "cyp-song"].join(", ");

export default class Filter extends HTMLElement {
	constructor() {
		super()

		html.node("input", {type:"text"}, "", this);
		html.icon("filter-variant", this);

		this.input.addEventListener("input", e => this.apply());
	}

	get value() { return this.input.value.trim(); }
	set value(value) { this.input.value = value; }
	protected get input() { return this.querySelector<HTMLInputElement>("input")!; }

	protected apply() {
		let value = this.value.toLowerCase();
		let all = [...this.parentNode!.querySelectorAll<Item>(SELECTOR)];
		all.forEach(item => item.hidden = !item.matchPrefix(value));
	}
}

customElements.define("cyp-filter", Filter);

import * as html from "./html.js";

export default class Item extends HTMLElement {
	constructor() {
		super();
		this.addEventListener("click", _ => this.onClick());
	}

	onClick() { this.parentNode.selection.toggle(this); }

	_buildTitle(title) {
		return html.node("span", {className:"title"}, title, this);
	}
}

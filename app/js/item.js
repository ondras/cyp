import * as html from "./html.js";


export default class Item extends HTMLElement {
	constructor() {
		super();
		this.addEventListener("click", _ => this.onClick());
	}

	addButton(icon, cb) {
		html.button({icon}, "", this).addEventListener("click", e => {
			e.stopPropagation(); // do not select
			cb();
		});
	}

	onClick() { this.parentNode.selection.toggle(this); }

	_buildTitle(title) {
		return html.node("span", {className:"title"}, title, this);
	}

	matchPrefix(prefix) {
		return this.textContent.match(/\w+/g).some(word => word.toLowerCase().startsWith(prefix));
	}
}

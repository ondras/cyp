import * as html from "./html.js";

export default class Selection {
	constructor(component) {
		this._component = component;
		this._items = new Set();
		this._node = html.node("cyp-commands", {hidden:true});

		const button = this.addCommand(_ => this.clear(), {icon:"close", label:"Clear"});
		button.classList.add("last");
	}

	clear() {
		const nodes = Array.from(this._items);
		while (nodes.length) { this._remove(nodes.pop()); }
	}

	toggle(node) {
		if (this._items.has(node)) {
			this._remove(node);
		} else {
			this._add(node);
		}
	}

	addCommand(cb, options) {
		const button = html.button({icon:options.icon}, "", this._node);
		html.node("span", {}, options.label, button);
		button.addEventListener("click", _ => cb(this._items));
		return button;
	}

	_add(node) {
		const size = this._items.size;
		this._items.add(node);
		node.classList.add("selected");
		if (size == 0) { this._show(); }
	}

	_remove(node) {
		this._items.delete(node);
		node.classList.remove("selected");
		if (this._items.size == 0) { this._hide(); }

	}

	_show() {
		const parent = this._component.closest("cyp-app").querySelector("footer");
		parent.appendChild(this._node);
		this._node.offsetWidth; // FIXME jde lepe?
		this._node.hidden = false;
	}

	_hide() {
		this._node.hidden = true;
		this._node.remove();
	}
}

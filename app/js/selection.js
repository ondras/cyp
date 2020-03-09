import * as html from "./html.js";

export default class Selection {
	constructor(component) {
		this._component = component;
		this._items = []; // FIXME ukladat skutecne HTML? co kdyz nastane refresh?
		this._node = html.node("cyp-commands", {hidden:true});
	}

	clear() {
		while (this._items.length) { this.remove(this._items[0]); }
	}

	addCommand(cb, options) {
		const button = html.button({icon:options.icon}, "", this._node);
		html.node("span", {}, options.label, button);
		button.addEventListener("click", _ => cb(this._items));
		return button;
	}

	addCommandAll(items) {
		this.addCommand(_ => {
			Array.from(this._component.children).forEach(node => this.add(node));
		}, {label:"Select all", icon:"plus"});
	}

	addCommandClear() {
		const button = this.addCommand(_ => this.clear(), {icon:"close", label:"Clear"});
		button.classList.add("last");
		return button;
	}

	toggle(node) {
		if (this._items.includes(node)) {
			this.remove(node);
		} else {
			this.add(node);
		}
	}

	add(node) {
		if (this._items.includes(node)) { return; }
		const length = this._items.length;
		this._items.push(node);
		node.classList.add("selected");
		if (length == 0) { this._show(); }
	}

	remove(node) {
		const index = this._items.indexOf(node);
		this._items.splice(index, 1);
		node.classList.remove("selected");
		if (this._items.length == 0) { this._hide(); }
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

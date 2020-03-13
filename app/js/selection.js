import * as html from "./html.js";

export default class Selection {
	constructor(component, mode) {
		this._component = component;
		/** @type {"single" | "multi"} */
		this._mode = mode;
		this._items = []; // FIXME ukladat skutecne HTML? co kdyz nastane refresh?
		this._node = html.node("cyp-commands", {hidden:true});
	}

	clear() {
		while (this._items.length) { this.remove(this._items[0]); }
	}

	addCommand(cb, options) {
		const button = html.button({icon:options.icon}, "", this._node);
		html.node("span", {}, options.label, button);
		button.addEventListener("click", _ => {
			const arg = (this._mode == "single" ? this._items[0] : this._items);
			cb(arg);
		});
		return button;
	}

	addCommandAll() {
		this.addCommand(_ => {
			Array.from(this._component.children)
				.filter(node => node.tagName.toLowerCase().startsWith("cyp-"))
				.forEach(node => this.add(node));
		}, {label:"Select all", icon:"checkbox-marked-outline"});
	}

	addCommandCancel() {
		const button = this.addCommand(_ => this.clear(), {icon:"cancel", label:"Cancel"});
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

		if (this._mode == "single" && length > 0) { this.remove(this._items[0]); }

		if (length == 0) { this._show(); }
	}

	remove(node) {
		const index = this._items.indexOf(node);
		this._items.splice(index, 1);
		node.classList.remove("selected");
		if (this._items.length == 0) { this._hide(); }
	}

	_show() {
		const parent = this._component.closest("cyp-app").querySelector("footer"); // FIXME jde lepe?
		parent.appendChild(this._node);
		this._node.offsetWidth; // FIXME jde lepe?
		this._node.hidden = false;
	}

	_hide() {
		this._node.hidden = true;
		this._node.remove();
	}
}

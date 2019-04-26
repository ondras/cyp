import * as html from "./html.js";

class Range extends HTMLElement {
	static get observedAttributes() { return ["min", "max", "value", "disabled"]; }

	constructor() {
		super();

		this._dom = {};

		this.innerHTML = `
			<span class="-track"></span>
			<span class="-elapsed"></span>
			<span class="-remaining"></span>
			<div class="-inner">
				<button class="-thumb"></button>
			</div>
		`;

		Array.from(this.querySelectorAll("[class^='-']")).forEach(node => {
			let name = node.className.substring(1);
			this._dom[name] = node;
		});

		this._update();

		this.addEventListener("mousedown", this);
	}

	set min(min) { this.setAttribute("min", min); }
	set max(max) { this.setAttribute("max", max); }
	set value(value) { this.setAttribute("value", value); }
	set disabled(disabled) {
		disabled ? this.setAttribute("disabled", "") : this.removeAttribute("disabled");
	}

	get value() { return (this.hasAttribute("value") ? this.getAttribute("value") : "50"); }
	get valueAsNumber() { return Number(this.value); }
	get min() { return this.getAttribute("min"); }
	get max() { return this.getAttribute("max"); }
	get disabled() { return this.hasAttribute("disabled"); }

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case "min":
			case "max":
			case "value":
				this._update();
			break;
		}
	}

	handleEvent(e) {
		switch (e.type) {
			case "mousedown":
				if (this.disabled) { return; }
				document.addEventListener("mousemove", this);
				document.addEventListener("mouseup", this);
				this._setToMouse(e);
			break;

			case "mousemove":
				this._setToMouse(e);
			break;

			case "mouseup":
				document.removeEventListener("mousemove", this);
				document.removeEventListener("mouseup", this);
				this.dispatchEvent(new CustomEvent("change"));
			break;
		}
	}

	_update() {
		let min = Number(this.min || 0);
		let max = Number(this.max || 100);
		let frac = (this.valueAsNumber - min) / (max - min);
		this._dom.thumb.style.left = `${frac * 100}%`;
		this._dom.remaining.style.left = `${frac * 100}%`;
		this._dom.elapsed.style.width = `${frac * 100}%`;
	}

	_setToMouse(e) {
		let rect = this._dom.inner.getBoundingClientRect();
		let x = e.clientX;
		x = Math.max(x, rect.left);
		x = Math.min(x, rect.right);

		let min = Number(this.min || 0);
		let max = Number(this.max || 100);

		let frac = (x-rect.left)/(rect.right-rect.left);
		let value = min + frac * (max-min);
		value = Math.round(value); // fixme
		if (value == this.valueAsNumber) { return; }

		this.value = value.toString();
		this.dispatchEvent(new CustomEvent("input"));
	}
}

customElements.define('x-range', Range);

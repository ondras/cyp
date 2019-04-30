import * as html from "./html.js";

class Range extends HTMLElement {
	static get observedAttributes() { return ["min", "max", "value", "step", "disabled"]; }

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
		this.addEventListener("keydown", this);
	}

	get _valueAsNumber() {
		let raw = (this.hasAttribute("value") ? Number(this.getAttribute("value")) : 50);
		return this._constrain(raw);
	}
	get _minAsNumber() {
		return (this.hasAttribute("min") ? Number(this.getAttribute("min")) : 0);
	}
	get _maxAsNumber() {
		return (this.hasAttribute("max") ? Number(this.getAttribute("max")) : 100);
	}
	get _stepAsNumber() {
		return (this.hasAttribute("step") ? Number(this.getAttribute("step")) : 1);
	}

	get value() { return String(this._valueAsNumber); }
	get valueAsNumber() { return this._valueAsNumber; }
	get min() { return this.hasAttribute("min") ? this.getAttribute("min") : ""; }
	get max() { return this.hasAttribute("max") ? this.getAttribute("max") : ""; }
	get step() { return this.hasAttribute("step") ? this.getAttribute("step") : ""; }
	get disabled() { return this.hasAttribute("disabled"); }

	set _valueAsNumber(value) { this.value = String(value); }
	set min(min) { this.setAttribute("min", min); }
	set max(max) { this.setAttribute("max", max); }
	set value(value) { this.setAttribute("value", value); }
	set step(step) { this.setAttribute("step", step); }
	set disabled(disabled) {
		disabled ? this.setAttribute("disabled", "") : this.removeAttribute("disabled");
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case "min":
			case "max":
			case "value":
			case "step":
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

			case "keydown":
				if (this.disabled) { return; }
				this._handleKey(e.code);
				this.dispatchEvent(new CustomEvent("input"));
				this.dispatchEvent(new CustomEvent("change"));
			break;
		}
	}

	_handleKey(code) {
		let min = this._minAsNumber;
		let max = this._maxAsNumber;
		let range = max - min;
		let step = this._stepAsNumber;

		switch (code) {
			case "ArrowLeft":
			case "ArrowDown":
				this._valueAsNumber = this._constrain(this._valueAsNumber - step);
			break;

			case "ArrowRight":
			case "ArrowUp":
				this._valueAsNumber = this._constrain(this._valueAsNumber + step);
			break;

			case "Home": this._valueAsNumber = this._constrain(min); break;
			case "End": this._valueAsNumber = this._constrain(max); break;

			case "PageUp": this._valueAsNumber = this._constrain(this._valueAsNumber + range/10); break;
			case "PageDown": this._valueAsNumber = this._constrain(this._valueAsNumber - range/10); break;
		}
	}

	_constrain(value) {
		const min = this._minAsNumber;
		const max = this._maxAsNumber;
		const step = this._stepAsNumber;

		value = Math.max(value, min);
		value = Math.min(value, max);

		value -= min;
		value = Math.round(value / step) * step;
		value += min;
		if (value > max) { value -= step; }

		return value;
	}

	_update() {
		let min = this._minAsNumber;
		let max = this._maxAsNumber;
		let frac = (this._valueAsNumber-min) / (max-min);
		this._dom.thumb.style.left = `${frac * 100}%`;
		this._dom.remaining.style.left = `${frac * 100}%`;
		this._dom.elapsed.style.width = `${frac * 100}%`;
	}

	_setToMouse(e) {
		let rect = this._dom.inner.getBoundingClientRect();
		let x = e.clientX;
		x = Math.max(x, rect.left);
		x = Math.min(x, rect.right);

		let min = this._minAsNumber;
		let max = this._maxAsNumber;

		let frac = (x-rect.left) / (rect.right-rect.left);
		let value = this._constrain(min + frac * (max-min));
		if (value == this._valueAsNumber) { return; }

		this._valueAsNumber = value;
		this.dispatchEvent(new CustomEvent("input"));
	}
}

customElements.define('x-range', Range);

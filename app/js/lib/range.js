import * as html from "./html.js";

class Range extends HTMLElement {
	static get observedAttributes() { return ["min", "max", "value"]; }

	constructor() {
		super();

		this._data = {
			min: 0,
			max: 100,
			value: 50
		};

		this.track = html.node("span", {className:"-track"});
		this.elapsed = html.node("span", {className:"-elapsed"});
		this.thumb = html.node("span", {className:"-thumb"});

		this.appendChild(this.track);
		this.appendChild(this.elapsed);
		this.appendChild(this.thumb);

		this._update();
	}

	set value(value) {
		value = Math.max(value, this._data.min);
		value = Math.min(value, this._data.max);
		this._data.value = value;
		this._update();
	}

	set min(min) {
		this._data.min = Math.min(min, this._data.max);
		this._update();
	}

	set max(max) {
		this._data.max = Math.max(max, this._data.max);
		this._update();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		this[name] = newValue;
	}

	get value() { return this._data.value; }
	get valueAsNumber() { return Number(this._data.value); }
	get min() { return this._data.min; }
	get max() { return this._data.max; }

	_update() {
		let frac = (this._data.value - this._data.min) / (this._data.max - this._data.min);
		this.thumb.style.left = `${frac * 100}%`;
		this.elapsed.style.width = `${frac * 100}%`;
	}
}

customElements.define('x-range', Range);

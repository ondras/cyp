import Item from "../item.js";
import * as html from "../html.js";


export default class Back extends Item {
	constructor(title) {
		super();
		this._title = title;
	}
	connectedCallback() {
		this.appendChild(html.icon("keyboard-backspace"));
		this._buildTitle(this._title);
	}
}

customElements.define("cyp-back", Back);

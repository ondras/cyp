import Item from "../item.js";
import * as html from "../html.js";


export default class Back extends Item {
	constructor(readonly title: string) {
		super();
	}

	connectedCallback() {
		this.append(html.icon("keyboard-backspace"));
		this.buildTitle(this.title);
	}
}

customElements.define("cyp-back", Back);

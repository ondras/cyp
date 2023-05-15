import Item from "../item.js";
import * as html from "../html.js";


export default class Back extends Item {
	constructor(title: string) {
		super();
		this.append(html.icon("keyboard-backspace"));
		this.buildTitle(title);
	}
}

customElements.define("cyp-back", Back);

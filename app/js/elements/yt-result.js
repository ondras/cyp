import Item from "../item.js";
import * as html from "../html.js";


export default class YtResult extends Item {
	constructor(title) {
		super();
		this._title = title;
	}

	connectedCallback() {
		this.appendChild(html.icon("magnify"));
		this._buildTitle(this._title);
	}

	onClick() {}
}

customElements.define("cyp-yt-result", YtResult);

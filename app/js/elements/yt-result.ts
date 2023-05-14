import Item from "../item.js";
import * as html from "../html.js";


export default class YtResult extends Item {
	constructor(readonly title: string) {
		super();
	}

	connectedCallback() {
		this.append(html.icon("magnify"));
		this.buildTitle(this.title);
	}
}

customElements.define("cyp-yt-result", YtResult);

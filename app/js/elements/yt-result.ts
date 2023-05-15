import Item from "../item.js";
import * as html from "../html.js";


export default class YtResult extends Item {
	constructor(title: string) {
		super()
		this.append(html.icon("magnify"));
		this.buildTitle(title);
	}
}

customElements.define("cyp-yt-result", YtResult);

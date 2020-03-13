import * as format from "../format.js";
import * as html from "../html.js";
import Item from "../item.js";

export default class Song extends Item {
	constructor(data) {
		super();
		this.data = data; // FIXME verejne?
		this.dataset.songId = data["Id"]; // FIXME toto maji jen ve fronte
	}

	connectedCallback() {
		const data = this.data;

		const block = html.node("div", {className:"multiline"}, "", this);

		const title = this._buildTitle(data);
		block.appendChild(title);
		if (data["Track"]) {
			const track = html.node("span", {className:"track"}, data["Track"].padStart(2, "0"));
			title.insertBefore(html.text(" "), title.firstChild);
			title.insertBefore(track, title.firstChild);
		}

		if (data["Title"]) {
			const subtitle = format.subtitle(data);
			html.node("span", {className:"subtitle"}, subtitle, block);
		}
	}

	_buildTitle(data) {
		return super._buildTitle(data["Title"] || fileName(data));
	}
}

customElements.define("cyp-song", Song);

// FIXME vyfaktorovat nekam do haje
function fileName(data) {
	return data["file"].split("/").pop();
}

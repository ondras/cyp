import * as format from "../format.js";
import * as html from "../html.js";
import Item from "../item.js";

export default class Song extends Item {
	constructor(data) {
		super();
		this.data = data;
		this.dataset.songId = data["Id"];
	}

	connectedCallback() {
		let block = html.node("div", {className:"multiline"}, "", this);

		let lines = formatSongInfo(this.data);
		block.appendChild(this._buildTitle(lines.shift()));

		lines.length && html.node("span", {className:"subtitle"}, lines.shift(), block);
	}
}

customElements.define("cyp-song", Song);


// FIXME vyfaktorovat nekam do haje
function formatSongInfo(data) {
	let lines = [];

	if (data["Title"]) {
		lines.push(data["Title"]);
		lines.push(format.subtitle(data));
	} else {
		lines.push(fileName(data));
		lines.push("\u00A0");
	}

	return lines;
}

// FIXME vyfaktorovat nekam do haje
function fileName(data) {
	return data["file"].split("/").pop();
}

import * as format from "../format.js";
import * as html from "../html.js";
import { Item } from "../component.js";

export default class Song extends Item {
	constructor(data) {
		super();
		this.data = data;
		this.dataset.songId = data["Id"];
	}

	connectedCallback() {
		let info = html.node("div", {className:"info"}, "", this);

		let lines = formatSongInfo(this.data);
		html.node("h2", {}, lines.shift(), info);
		lines.length && html.node("div", {}, lines.shift(), info);

		html.button({icon:"play"}, "", this).addEventListener("click", async e => {
			e.stopPropagation(); // do not select
			await this._mpd.command(`playid ${this.data["Id"]}`);
		});
	}
}

customElements.define("cyp-song", Song);


// FIXME vyfaktorovat nekam do haje
function formatSongInfo(data) {
	let lines = [];
	let tokens = [];

	if (data["Title"]) {
		tokens.push(data["Title"]);
		lines.push(tokens.join(" "));
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

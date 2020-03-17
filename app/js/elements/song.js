import * as format from "../format.js";
import * as html from "../html.js";
import Item from "../item.js";

export default class Song extends Item {
	constructor(data) {
		super();
		this._data = data;
	}

	get file() { return this._data["file"]; }
	get songId() { return this._data["Id"]; }

	set playing(playing) {
		this.classList.toggle("playing", playing);
	}

	connectedCallback() {
		const data = this._data;

		html.icon("music", this);
		html.icon("play", this);

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

		this.playing = false;
	}

	_buildTitle(data) {
		return super._buildTitle(data["Title"] || format.fileName(this.file));
	}
}

customElements.define("cyp-song", Song);

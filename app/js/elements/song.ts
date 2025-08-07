import * as format from "../format.js";
import * as html from "../html.js";
import Item from "../item.js";
import { SongData } from "../parser.js";


export default class Song extends Item {
	constructor(protected data: SongData) {
		super();

		html.icon("music", this);
		html.icon("play", this);

		const block = html.node("div", {className:"multiline"}, "", this);

		const title = this.buildSongTitle(data);
		block.append(title);

		if (data.Track) {
			const track = html.node("span", {className:"track"}, data.Track.padStart(2, "0"));
			title.insertBefore(html.text(" "), title.firstChild);
			title.insertBefore(track, title.firstChild);
		}

		if (data.Title) {
			const subtitle = format.subtitle(data);
			html.node("span", {className:"subtitle"}, subtitle, block);
		}

		this.playing = false;
	}

	get file() { return this.data.file; }
	get songId() { return this.data.Id; }

	set playing(playing: boolean) {
		this.classList.toggle("playing", playing);
	}

	protected buildSongTitle(data: SongData) {
		return super.buildTitle(data.Title || data.Name || format.fileName(this.file));
	}
}

customElements.define("cyp-song", Song);

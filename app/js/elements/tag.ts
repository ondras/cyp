import * as html from "../html.js";
import * as art from "../art.js";
import Item from "../item.js";
import MPD from "../mpd.js";


const ICONS = {
	"AlbumArtist": "artist",
	"Album": "album",
	"Genre": "music"
}

export type TagType = "Album" | "AlbumArtist" | "Genre";
export type TagFilter = Record<string, string>;


export default class Tag extends Item {
	constructor(readonly type: TagType, protected value: string, protected filter: TagFilter) {
		super();
	}

	connectedCallback() {
		html.node("span", {className:"art"}, "", this);
		this.buildTitle(this.value);
	}

	createChildFilter(): TagFilter {
		return Object.assign({[this.type]:this.value}, this.filter);
	}

	async fillArt(mpd: MPD) {
		const parent = this.firstChild as HTMLElement;
		const filter = this.createChildFilter();

		let artist = filter["AlbumArtist"];
		let album = filter["Album"];
		let src = null;

		if (artist && album) {
			src = await art.get(mpd, artist, album);
			if (!src) {
				let songs = await mpd.listSongs(filter, [0,1]);
				if (songs.length) {
					src = await art.get(mpd, artist, album, songs[0]["file"]);
				}
			}
		}

		if (src) {
			html.node("img", {src}, "", parent);
		} else {
			const icon = ICONS[this.type];
			html.icon(icon, parent);
		}
	}
}

customElements.define("cyp-tag", Tag);

import * as html from "../html.js";
import Component from "../component.js";
import Playlist from "./playlist.js";
import { escape } from "../mpd.js";
import Song from "./song.js";
import Back from "./back.js";
import Selection from "../selection.js";
import { SongData } from "../parser.js";


class Playlists extends Component {
	protected selection!: Selection;
	protected current?: string;

	handleEvent(e: CustomEvent) {
		switch (e.type) {
			case "idle-change":
				e.detail.includes("stored_playlist") && this.sync();
			break;
		}
	}

	protected onAppLoad() {
		const { app } = this;
		this.selection = app.createSelection();
		app.addEventListener("idle-change", this);
		this.sync();
	}

	protected onComponentChange(c: string, isThis: boolean) {
		this.hidden = !isThis;
	}

	protected async sync() {
		if (this.current) {
			let songs = await this.mpd.listPlaylistItems(this.current);
			this.buildSongs(songs);
		} else {
			let lists = await this.mpd.listPlaylists();
			this.buildLists(lists);
		}
	}

	protected buildSongs(songs: SongData[]) {
		html.clear(this);
		this.buildBack();

		let nodes = songs.map(song => new Song(song));
		this.append(...nodes);

		this.configureSelectionSongs(nodes);
	}

	protected buildLists(lists: string[]) {
		html.clear(this);

		let playlists = lists.map(name => new Playlist(name));
		this.append(...playlists);
		playlists.forEach(playlist => {
			playlist.addButton("chevron-double-right", () => {
				this.current = playlist.name;
				this.sync();
			});
		})

		this.configureSelectionLists(playlists);
	}

	protected buildBack() {
		const node = new Back("Playlists");
		this.append(node);
		node.onclick = () => {
			this.current = undefined;
			this.sync();
		}
	}

	protected configureSelectionSongs(songs: Song[]) {
		const { selection, mpd } = this;

		let commands = [{
			cb: async (items: Song[]) => {
				await mpd.command(["clear", ...items.map(createAddCommand), "play"]);
				selection.clear(); // fixme notification?
			},
			label:"Play",
			icon:"play"
		}, {
			cb: async (items: Song[]) => {
				await mpd.command(items.map(createAddCommand));
				selection.clear(); // fixme notification?
			},
			label:"Enqueue",
			icon:"plus"
		}];

		selection.configure(songs, "multi", commands);
	}

	protected configureSelectionLists(lists: Playlist[]) {
		const { mpd, selection } = this;

		let commands = [{
			cb: async (item: Playlist) => {
				const name = item.name;
				const commands = ["clear", `load "${escape(name)}"`, "play"];
				await mpd.command(commands);
				selection.clear(); // fixme notification?
			},
			label:"Play",
			icon:"play"
		}, {
			cb: async (item: Playlist) => {
				const name = item.name;
				await mpd.command(`load "${escape(name)}"`);
				selection.clear(); // fixme notification?
			},
			label:"Enqueue",
			icon:"plus"
		}, {
			cb: async (item: Playlist) => {
				const name = item.name;
				if (!confirm(`Really delete playlist '${name}'?`)) { return; }

				await mpd.command(`rm "${escape(name)}"`);
			},
			label:"Delete",
			icon:"delete"
		}];

		selection.configure(lists, "single", commands);
	}
}

customElements.define("cyp-playlists", Playlists);

function createAddCommand(node: Song) {
	return `add "${escape(node.file)}"`;
}

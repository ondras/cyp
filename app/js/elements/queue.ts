import * as html from "../html.js";
import Component from "../component.js";
import Song from "./song.js";
import { escape } from "../mpd.js";
import Selection from "../selection.js";
import { SongData } from "../parser.js";


function generateMoveCommands(items: Song[], diff: number, parent: HTMLElement) {
	let all = [...parent.children].filter(node => node instanceof Song);
	const COMPARE = (a: Song, b: Song) => all.indexOf(a) - all.indexOf(b);

	return items.sort(COMPARE)
		.map(item => {
			let index = all.indexOf(item) + diff;
			if (index < 0 || index >= all.length) { return null; } // this does not move
			return `moveid ${item.songId} ${index}`;
		})
		.filter(command => command) as string[];
}

class Queue extends Component {
	protected selection!: Selection;
	protected currentId?: string;

	handleEvent(e: CustomEvent) {
		switch (e.type) {
			case "song-change":
				this.currentId = e.detail["Id"];
				this.updateCurrent();
			break;

			case "idle-change":
				e.detail.includes("playlist") && this.sync();
			break;
		}
	}

	protected onAppLoad() {
		const { app } = this;
		this.selection = app.createSelection();
		app.addEventListener("idle-change", this);
		app.addEventListener("song-change", this);
		this.sync();
	}

	protected onComponentChange(c: string, isThis: boolean) {
		this.hidden = !isThis;
	}

	protected async sync() {
		let songs = await this.mpd.listQueue();
		this.buildSongs(songs);

		let e = new CustomEvent("queue-length-change", {detail:songs.length});
		this.app.dispatchEvent(e);
	}

	protected updateCurrent() {
		let songs = [...this.children].filter(node => node instanceof Song) as Song[];
		songs.forEach(node => {
			node.playing = (node.songId == this.currentId);
		});
	}

	protected buildSongs(songs: SongData[]) {
		html.clear(this);

		let nodes = songs.map(song => {
			let node = new Song(song);
			node.addButton("play", async () => {
				await this.mpd.command(`playid ${node.songId}`);
			});
			return node;
		});
		this.append(...nodes);

		this.configureSelection(nodes);
		this.updateCurrent();
	}

	protected configureSelection(nodes: Song[]) {
		const { mpd, selection } = this;

		let commands = [{
			cb: (items: Song[]) => {
				const commands = generateMoveCommands(items, -1, this);
				mpd.command(commands);
			},
			label:"Up",
			icon:"arrow-up-bold"
		}, {
			cb: (items: Song[]) => {
				const commands = generateMoveCommands(items, +1, this);
				mpd.command(commands.reverse()); // move last first
			},
			label:"Down",
			icon:"arrow-down-bold"
		}, {
			cb: async (items: Song[]) => {
				let name = prompt("Save selected songs as a playlist?", "name");
				if (name === null) { return; }

				name = escape(name);
				try { // might not exist
					await mpd.command(`rm "${name}"`);
				} catch (e) {}

				const commands = items.map(item => {
					return `playlistadd "${name}" "${escape(item.file)}"`;
				});
				await mpd.command(commands);

				selection.clear();
			},
			label:"Save",
			icon:"content-save"
		}, {
			cb: async (items: Song[]) => {
				if (!confirm(`Remove these ${items.length} songs from the queue?`)) { return; }

				const commands = items.map(item => `deleteid ${item.songId}`);
				mpd.command(commands);
			},
			label:"Remove",
			icon:"delete"
		}];

		selection.configure(nodes, "multi", commands);
	}
}

customElements.define("cyp-queue", Queue);

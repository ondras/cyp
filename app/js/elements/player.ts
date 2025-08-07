import * as art from "../art.js";
import * as html from "../html.js";
import * as format from "../format.js";
import Component from "../component.js";
import { SongData, StatusData } from "../parser.js";


const ELAPSED_PERIOD = 500;

class Player extends Component {
	protected current = {
		song: {} as SongData,
		elapsed: 0,
		at: 0,
		volume: 0
	}
	protected toggleVolume = 0;
	protected DOM: Record<string, HTMLElement>;

	constructor() {
		super();

		const DOM: Record<string, HTMLElement> = {};
		const all = this.querySelectorAll<HTMLElement>("[class]");
		[...all].forEach(node => DOM[node.className] = node);
		DOM.progress = DOM.timeline.querySelector("x-range")!;
		DOM.volume = DOM.volume.querySelector("x-range")!;

		this.DOM = DOM;
	}

	handleEvent(e: CustomEvent) {
		switch (e.type) {
			case "idle-change":
				let hasOptions = e.detail.includes("options");
				let hasPlayer = e.detail.includes("player");
				let hasMixer = e.detail.includes("mixer");
				(hasOptions || hasPlayer || hasMixer) && this.updateStatus();
				hasPlayer && this.updateCurrent();
			break;
		}
	}

	protected onAppLoad() {
		this.addEvents();
		this.updateStatus();
		this.updateCurrent();
		this.app.addEventListener("idle-change", this);

		setInterval(() => this.updateElapsed(), ELAPSED_PERIOD);
	}

	protected async updateStatus() {
		const { current, mpd } = this;
		const data = await mpd.status();

		this.updateFlags(data);
		this.updateVolume(data);

		// rebase the time sync
		current.elapsed = Number(data.elapsed || 0);
		current.at = performance.now();
	}

	protected async updateCurrent() {
		const { current, mpd, DOM } = this;
		const data = await mpd.currentSong();

		if (data.file) { // is there a song at all?
			DOM.title.textContent = data.Title || data.Name || format.fileName(data.file);
			DOM.subtitle.textContent = format.subtitle(data, {duration:false});

			let duration = Number(data.duration);
			if (duration) {
				DOM.duration.textContent = format.time(duration);
				(DOM.progress as HTMLInputElement).max = String(duration);
				(DOM.progress as HTMLInputElement).disabled = false;
			} else {
				DOM.duration.textContent = "";
				(DOM.progress as HTMLInputElement).max = "0";
				(DOM.progress as HTMLInputElement).disabled = true;
			}
		} else {
			DOM.title.textContent = "";
			DOM.subtitle.textContent = "";
			DOM.duration.textContent = "";
			(DOM.progress as HTMLInputElement).max = "0";
			(DOM.progress as HTMLInputElement).value = "0";
			(DOM.progress as HTMLInputElement).disabled = true;
		}
		if (data.file != current.song.file) { // changed song
			this.dispatchSongChange(data);
		}

		let artistNew = data.Artist || data.AlbumArtist || "";
		let artistOld = current.song["Artist"] || current.song["AlbumArtist"];
		let albumNew = data["Album"];
		let albumOld = current.song["Album"];

		Object.assign(current.song, data);

		if (artistNew != artistOld || albumNew != albumOld) { // changed album (art)
			html.clear(DOM.art);
			let src = await art.get(mpd, artistNew, data.Album || "", data.file);
			if (src) {
				html.node("img", {src}, "", DOM.art);
			} else {
				html.icon("music", DOM.art);
			}
		}
	}

	protected updateElapsed() {
		const { current, DOM } = this;

		let elapsed = 0;
		if (current.song["file"]) {
			elapsed = current.elapsed;
			if (this.dataset.state == "play") { elapsed += (performance.now() - current.at)/1000; }
		}

		let progress = DOM.progress as HTMLInputElement;
		progress.value = String(elapsed);
		DOM.elapsed.textContent = format.time(elapsed);
		this.app.style.setProperty("--progress", String(elapsed/Number(progress.max)));
	}

	protected updateFlags(data: StatusData) {
		let flags: string[] = [];
		if (data.random == "1") { flags.push("random"); }
		if (data.repeat == "1") { flags.push("repeat"); }
		if (data.volume === "0") { flags.push("mute"); } // strict, because volume might be missing
		this.dataset.flags = flags.join(" ");
		this.dataset.state = data["state"];
	}

	protected updateVolume(data: StatusData) {
		const { current, DOM } = this;

		if ("volume" in data) {
			let volume = Number(data.volume);

			(DOM.mute as HTMLInputElement).disabled = false;
			(DOM.volume as HTMLInputElement).disabled = false;
			(DOM.volume as HTMLInputElement).value = String(volume);

			if (volume == 0 && current.volume > 0) { this.toggleVolume = current.volume; } // muted
			if (volume > 0 && current.volume == 0) { this.toggleVolume = 0; } // restored
			current.volume = volume;
		} else {
			(DOM.mute as HTMLInputElement).disabled = true;
			(DOM.volume as HTMLInputElement).disabled = true;
			(DOM.volume as HTMLInputElement).value = String(50);
		}
	}

	protected addEvents() {
		const { current, mpd, DOM } = this;

		DOM.play.addEventListener("click", _ => mpd.command("play"));
		DOM.pause.addEventListener("click", _ => mpd.command("pause 1"));
		DOM.prev.addEventListener("click", _ => mpd.command("previous"));
		DOM.next.addEventListener("click", _ => mpd.command("next"));

		DOM.random.addEventListener("click", _ => {
			let isRandom = this.dataset.flags!.split(" ").includes("random");
			mpd.command(`random ${isRandom ? "0" : "1"}`);
		});
		DOM.repeat.addEventListener("click", _ => {
			let isRepeat = this.dataset.flags!.split(" ").includes("repeat");
			mpd.command(`repeat ${isRepeat ? "0" : "1"}`);
		});

		DOM.progress.addEventListener("input", e => {
			let elapsed = (e.target as HTMLInputElement).valueAsNumber;
			current.elapsed = elapsed;
			current.at = performance.now();
			mpd.command(`seekcur ${elapsed}`);
		});

		DOM.volume.addEventListener("input", e => mpd.command(`setvol ${(e.target as HTMLInputElement).valueAsNumber}`));
		DOM.mute.addEventListener("click", () => mpd.command(`setvol ${this.toggleVolume}`));
	}

	protected dispatchSongChange(detail: SongData) {
		const e = new CustomEvent("song-change", {detail});
		this.app.dispatchEvent(e);
	}
}

customElements.define("cyp-player", Player);

import * as art from "../art.js";
import * as html from "../html.js";
import * as format from "../format.js";
import Component from "../component.js";


const ELAPSED_PERIOD = 500;

class Player extends Component {
	constructor() {
		super();
		this._current = {
			song: {},
			elapsed: 0,
			at: 0,
			volume: 0
		};
		this._toggledVolume = 0;

		const DOM = {};
		const all = this.querySelectorAll("[class]");
		[...all].forEach(node => DOM[node.className] = node);
		DOM.progress = DOM.timeline.querySelector("x-range");
		DOM.volume = DOM.volume.querySelector("x-range");

		this._dom = DOM;
	}

	handleEvent(e) {
		switch (e.type) {
			case "idle-change":
				let hasOptions = e.detail.includes("options");
				let hasPlayer = e.detail.includes("player");
				(hasOptions || hasPlayer) && this._updateStatus();
				hasPlayer && this._updateCurrent();
			break;
		}
	}

	_onAppLoad() {
		this._addEvents();
		this._updateStatus();
		this._updateCurrent();
		window.addEventListener("idle-change", this);

		setInterval(() => this._updateElapsed(), ELAPSED_PERIOD);
	}

	async _updateStatus() {
		const data = await this._mpd.status();
		const DOM = this._dom;

		this._updateFlags(data);
		this._updateVolume(data);

		if ("duration" in data) { // play/pause
			let duration = Number(data["duration"]);
			DOM.duration.textContent = format.time(duration);
			DOM.progress.max = duration;
			DOM.progress.disabled = false;
		} else { // no song at all
			DOM.progress.value = 0;
			DOM.progress.disabled = true;
		}

		// rebase the time sync
		this._current.elapsed = Number(data["elapsed"] || 0);
		this._current.at = performance.now();
	}

	async _updateCurrent() {
		const data = await this._mpd.currentSong();
		const DOM = this._dom;

		if (data["file"] != this._current.song["file"]) { // changed song
			if (data["file"]) { // is there a song at all?
				DOM.title.textContent = data["Title"] || format.fileName(data["file"]);
				DOM.subtitle.textContent = format.subtitle(data, {duration:false});
			} else {
				DOM.title.textContent = "";
				DOM.subtitle.textContent = "";
			}

			this._dispatchSongChange(data);
		}

		let artistNew = data["AlbumArtist"] || data["Artist"];
		let artistOld = this._current.song["AlbumArtist"] || this._current.song["Artist"];
		let albumNew = data["Album"];
		let albumOld = this._current.song["Album"];

		Object.assign(this._current.song, data);

		if (artistNew != artistOld || albumNew != albumOld) { // changed album (art)
			html.clear(DOM.art);
			let src = await art.get(this._mpd, artistNew, data["Album"], data["file"]);
			if (src) {
				html.node("img", {src}, "", DOM.art);
			} else {
				html.icon("music", DOM.art);
			}
		}
	}

	_updateElapsed() {
		const DOM = this._dom;

		let elapsed = 0;
		if (this._current.song["file"]) {
			elapsed = this._current.elapsed;
			if (this.dataset.state == "play") { elapsed += (performance.now() - this._current.at)/1000; }
		}

		DOM.progress.value = elapsed;
		DOM.elapsed.textContent = format.time(elapsed);
		this._app.style.setProperty("--progress", DOM.progress.value/DOM.progress.max);
	}

	_updateFlags(data) {
		let flags = [];
		if (data["random"] == "1") { flags.push("random"); }
		if (data["repeat"] == "1") { flags.push("repeat"); }
		this.dataset.flags = flags.join(" ");
		this.dataset.state = data["state"];
	}

	_updateVolume(data) {
		const DOM = this._dom;

		if ("volume" in data) {
			let volume = Number(data["volume"]);

			DOM.mute.disabled = false;
			DOM.volume.disabled = false;
			DOM.volume.value = volume;

			if (volume == 0 && this._current.volume > 0) { // muted
				this._toggledVolume = this._current.volume;
				html.clear(DOM.mute);
				DOM.mute.appendChild(html.icon("volume-off"));
			}

			if (volume > 0 && this._current.volume == 0) { // restored
				this._toggledVolume = 0;
				html.clear(DOM.mute);
				DOM.mute.appendChild(html.icon("volume-high"));
			}
			this._current.volume = volume;
		} else {
			DOM.mute.disabled = true;
			DOM.volume.disabled = true;
			DOM.volume.value = 50;
		}
	}

	_addEvents() {
		const DOM = this._dom;

		DOM.play.addEventListener("click", _ => this._app.mpd.command("play"));
		DOM.pause.addEventListener("click", _ => this._app.mpd.command("pause 1"));
		DOM.prev.addEventListener("click", _ => this._app.mpd.command("previous"));
		DOM.next.addEventListener("click", _ => this._app.mpd.command("next"));

		DOM.random.addEventListener("click", _ => {
			let isRandom = this.dataset.flags.split(" ").includes("random");
			this._app.mpd.command(`random ${isRandom ? "0" : "1"}`);
		});
		DOM.repeat.addEventListener("click", _ => {
			let isRepeat = this.dataset.flags.split(" ").includes("repeat");
			this._app.mpd.command(`repeat ${isRepeat ? "0" : "1"}`);
		});

		DOM.progress.addEventListener("input", e => {
			let elapsed = e.target.valueAsNumber;
			this._current.elapsed = elapsed;
			this._current.at = performance.now();
			this._app.mpd.command(`seekcur ${elapsed}`);
		});

		DOM.volume.addEventListener("input", e => this._app.mpd.command(`setvol ${e.target.valueAsNumber}`));
		DOM.mute.addEventListener("click", _ => this._app.mpd.command(`setvol ${this._toggledVolume}`));
	}

	_dispatchSongChange(detail) {
		const e = new CustomEvent("song-change", {detail});
		this._app.dispatchEvent(e);
	}
}

customElements.define("cyp-player", Player);

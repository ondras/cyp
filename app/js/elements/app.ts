import MPD from "../mpd.js";
import * as html from "../html.js";
import Selection from "../selection.js";


function initIcons() {
	[...document.querySelectorAll<HTMLElement>("[data-icon]")].forEach(node => {
		node.dataset.icon!.split(" ").forEach(name => {
			let icon = html.icon(name);
			node.prepend(icon);
		});
	});
}

export default class App extends HTMLElement {
	mpd!: MPD;

	static get observedAttributes() { return ["component"]; }

	constructor() {
		super();
		initIcons();
	}

	async connectedCallback() {
		await waitForChildren(this);

		window.addEventListener("hashchange", e => this.onHashChange());
		this.onHashChange();

		await this.connect();
		this.dispatchEvent(new CustomEvent("load"));

		this.initMediaHandler();
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		switch (name) {
			case "component":
				location.hash = newValue;
				const e = new CustomEvent("component-change");
				this.dispatchEvent(e);
			break;
		}
	}

	get component() { return this.getAttribute("component") || ""; }
	set component(component) { this.setAttribute("component", component); }

	createSelection() {
		let selection = new Selection();
		this.querySelector("footer")!.append(selection.commands);
		return selection;
	}

	protected onHashChange() {
		const component = location.hash.substring(1) || "queue";
		if (component != this.component) { this.component = component; }
	}

	protected onChange(changed: string[]) { this.dispatchEvent(new CustomEvent("idle-change", {detail:changed})); }

	protected async onClose(e: CloseEvent) {
		await sleep(3000);
		this.connect();
	}

	protected async connect() {
		const attempts = 3;
		for (let i=0;i<attempts;i++) {
			try {
				let mpd = await MPD.connect();
				mpd.onChange = changed => this.onChange(changed);
				mpd.onClose = e => this.onClose(e);
				this.mpd = mpd;
				return;
			} catch (e) {
				await sleep(500);
			}
		}
		alert(`Failed to connect to MPD after ${attempts} attempts. Please reload the page to try again.`);
	}

	protected initMediaHandler() {
		// check support mediaSession
		if (!('mediaSession' in navigator)) {
			console.log('mediaSession is not supported');
			return;
		}

		// DOM (using media session controls are allowed only if there is audio/video tag)
		const audio = html.node("audio", {loop: true}, "", this);
		html.node("source", {src: 'https://raw.githubusercontent.com/anars/blank-audio/master/10-seconds-of-silence.mp3'}, '', audio);

		// Init event session (play audio) on click (because restrictions by web browsers)
		window.addEventListener('click', () => {
				audio.play();
		}, {once: true});

		// mediaSession define metadata
		navigator.mediaSession.metadata = new MediaMetadata({
			title: 'Control Your Player'
		});

		// mediaSession define action handlers
		navigator.mediaSession.setActionHandler('play', () => {
			this.mpd.command("play")
			audio.play()
		});
		navigator.mediaSession.setActionHandler('pause', () => {
			this.mpd.command("pause 1")
			audio.pause()
		});
		navigator.mediaSession.setActionHandler('previoustrack', () => {
			this.mpd.command("previous")
			audio.play()
		});
		navigator.mediaSession.setActionHandler('nexttrack', () => {
			this.mpd.command("next")
			audio.play()
		});
	}
}

customElements.define("cyp-app", App);

function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

function waitForChildren(app: App) {
	const children = [...app.querySelectorAll("*")];
	const names = children.map(node => node.nodeName.toLowerCase())
		.filter(name => name.startsWith("cyp-"));
	const unique = new Set(names);

	const promises = [...unique].map(name => customElements.whenDefined(name));
	return Promise.all(promises);
}

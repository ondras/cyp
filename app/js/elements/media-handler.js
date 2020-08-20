import Component from "../component.js";
import * as html from "../html.js";

class MediaHandler extends Component {
	connectedCallback() {
		// check support mediaSession
		if (!('mediaSession' in navigator)) {
			console.log('mediaSession is not supported');
			return;
		}

		// DOM (using media session controls are allowed only if there is audio/video tag)
		const audio = html.node("audio", {loop: true}, "", this);
		html.node("source", {src: 'https://raw.githubusercontent.com/anars/blank-audio/master/10-seconds-of-silence.mp3'}, '', audio);

		// Init event session (play audio) on click (because restrictions by web browsers)
		let mediaSessionInit = false;
		window.addEventListener('click', () => {
			if (!mediaSessionInit) {
				audio.play();
				mediaSessionInit = true;
			}
		});

		// mediaSession define metadata
		navigator.mediaSession.metadata = new MediaMetadata({
			title: 'Control Your Player'
		});

		// mediaSession define action handlers
		const that = this;
		navigator.mediaSession.setActionHandler('play', function() {
			that._mpd.command("play")
			audio.play()
		});
		navigator.mediaSession.setActionHandler('pause', function() {
			that._mpd.command("pause 1")
			audio.pause()
		});
		navigator.mediaSession.setActionHandler('previoustrack', function() {
			that._mpd.command("previous")
			audio.play()
		});
		navigator.mediaSession.setActionHandler('nexttrack', function() {
			that._mpd.command("next")
			audio.play()
		});
	}
}

customElements.define("cyp-media-handler", MediaHandler);

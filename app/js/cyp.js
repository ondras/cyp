import "./elements/range.js";
import "./elements/app.js";
import "./elements/menu.js";
import "./elements/player.js";
import "./elements/queue.js";
import "./elements/playlists.js";
import "./elements/settings.js";
import "./elements/yt.js";
import "./elements/song.js";
import "./elements/library.js";
import "./elements/tag.js";
import "./elements/back.js";
import "./elements/path.js";
import "./elements/media-handler.js";

function updateSize() {
	document.body.style.setProperty("--vh", window.innerHeight/100);
}

window.addEventListener("resize", updateSize);
updateSize();

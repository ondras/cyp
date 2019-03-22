export function time(sec) {
	sec = Math.round(sec);
	let m = Math.floor(sec / 60);
	let s = sec % 60;
	return `${m}:${s.toString().padStart(2, "0")}`;
}

export function artistAlbum(artist, album) {
	let tokens = [];
	artist && tokens.push(artist);
	album && tokens.push(album);
	return tokens.join(" – ");
}
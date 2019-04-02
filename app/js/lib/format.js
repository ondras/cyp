export const SEPARATOR = " · ";

export function time(sec) {
	sec = Math.round(sec);
	let m = Math.floor(sec / 60);
	let s = sec % 60;
	return `${m}:${s.toString().padStart(2, "0")}`;
}

export function subtitle(data) {
	let tokens = [];
	data["Artist"] && tokens.push(data["Artist"]);
	data["Album"] && tokens.push(data["Album"]);
	data["duration"] && tokens.push(time(Number(data["duration"])));
	return tokens.join(SEPARATOR);
}
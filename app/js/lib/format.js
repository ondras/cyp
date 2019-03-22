export function time(sec) {
	sec = Math.round(sec);
	let m = Math.floor(sec / 60);
	let s = sec % 60;
	return `${m}:${s.toString().padStart(2, "0")}`;
}

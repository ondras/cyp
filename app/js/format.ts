import { SongData } from "./parser.js";


export const SEPARATOR = " · ";

export function time(sec: number) {
	sec = Math.round(sec);
	let m = Math.floor(sec / 60);
	let s = sec % 60;
	return `${m}:${s.toString().padStart(2, "0")}`;
}

export function subtitle(data: SongData, options = {duration:true}) {
	let tokens: string[] = [];

	if (data.Artist) {
		tokens.push(data.Artist);
	} else if (data.AlbumArtist) {
		tokens.push(data.AlbumArtist);
	}

	data.Album && tokens.push(data.Album);
	options.duration && data.duration && tokens.push(time(Number(data.duration)));

	return tokens.join(SEPARATOR);
}

export function fileName(file: string) {
	return file.split("/").pop() || "";
}

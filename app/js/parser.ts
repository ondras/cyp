export type Struct = Record<string, string | string[]>;
export interface SongData {
	Id: string;
	file: string;
	Track?: string;
	Title?: string;
	Artist?: string;
	AlbumArtist?: string;
	Album?: string;
	duration?: string;
}

export interface PathData {
	file?: string;
	directory?: string;
	playlist?: string;
}

export interface StatusData {
	random?: string;
	repeat?: string;
	volume?: string;
	state?: string;
	elapsed?: string;
}

export function linesToStruct<T = Struct>(lines: string[]): T {
	let result: Struct = {};

	lines.forEach(line => {
		let cindex = line.indexOf(":");
		if (cindex == -1) { throw new Error(`Malformed line "${line}"`); }
		let key = line.substring(0, cindex);
		let value = line.substring(cindex+2);
		if (key in result) {
			let old = result[key];
			if (old instanceof Array) {
				old.push(value);
			} else {
				result[key] = [old!, value];
			}
		} else {
			result[key] = value;
		}
	});
	return result as T;
}

export function songList(lines: string[]) {
	let songs: SongData[] = [];
	let batch: string[] = [];
	while (lines.length) {
		let line = lines[0];
		if (line.startsWith("file:") && batch.length) {
			let song = linesToStruct<SongData>(batch);
			songs.push(song);
			batch = [];
		}
		batch.push(lines.shift()!);
	}

	if (batch.length) {
		let song = linesToStruct<SongData>(batch);
		songs.push(song);
	}

	return songs;
}

export function pathContents(lines: string[]) {
	const prefixes = ["file", "directory", "playlist"];

	let batch: string[] = [];
	let result: Record<string, PathData[]> = {};
	let batchPrefix = "";
	prefixes.forEach(prefix => result[prefix] = []);

	while (lines.length) {
		let line = lines[0];
		let prefix = line.split(":")[0];
		if (prefixes.includes(prefix)) { // begin of a new batch
			if (batch.length) { result[batchPrefix].push(linesToStruct<PathData>(batch)); }
			batchPrefix = prefix;
			batch = [];
		}
		batch.push(lines.shift()!);
	}

	if (batch.length) { result[batchPrefix].push(linesToStruct<PathData>(batch)); }

	return result;
}

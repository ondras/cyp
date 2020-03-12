export function command(cmd) {
	console.warn(`mpd-mock does not know "${cmd}"`);
}

export function commandAndStatus(cmd) {
	command(cmd);
	return status();
}

export function status() {
	return {
		volume: 50,
		elapsed: 10,
		duration: 70,
		file: "name.mp3",
		Title: "Title of song",
		Artist: "Artist of song",
		Album: "Album of song",
		Track: 6,
		state: "play",
		Id: 2
	}
}

export function listQueue() {
	return [
		{Id:1, Track:5, Title:"Title 1", Artist:"AAA", Album:"BBB", duration:30},
		status(),
		{Id:3, Track:7, Title:"Title 3", Artist:"CCC", Album:"DDD", duration:230},
	];
}

export function listPlaylists() {
	return [
		"Playlist 1",
		"Playlist 2",
		"Playlist 3"
	];
}

export function listPath(path) {
	return {
		"directory": [
			{"directory": "Dir 1"},
			{"directory": "Dir 2"},
			{"directory": "Dir 3"}
		],
		"file": [
			{"file": "File 1"},
			{"file": "File 2"},
			{"file": "File 3"}
		]
	}
}

export function listTags(tag, filter = null) {
	switch (tag) {
		case "AlbumArtist": return ["Artist 1", "Artist 2", "Artist 3"];
		case "Album": return ["Album 1", "Album 2", "Album 3"];
	}
}

export function listSongs(filter, window = null) {
	return listQueue();
}

export function albumArt(songUrl) {
	return null;
}

export function init() {}

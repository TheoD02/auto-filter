const fs = require('fs');
const mm = require('music-metadata');
const db = require('./db').db;
const request = require('request');

/**
 * Chemin d'accès à analyser.
 */
const directoriesPath = ['J:\\Musique\\deemix Music\\RAP'];

// List all files in a directory in Node.js recursively in a synchronous fashion
const walkSync = function (dir, filelist) {
	var path = path || require('path');
	var fs = fs || require('fs'),
		files = fs.readdirSync(dir);
	filelist = filelist || [];
	files.forEach(function (file) {
		if (fs.statSync(path.join(dir, file)).isDirectory()) {
			filelist = walkSync(path.join(dir, file), filelist);
		} else {
			if (path.extname(file) === '.mp3' || path.extname(file) === '.flac' || path.extname(file) === '.wav') {
				filelist.push({
					absolute: path.join(dir, file),
					relative: file,
				});
			}
		}
	});
	return filelist;
};

// Liste des fichiers
(async () => {
	console.log('Stating scan...');
	let tracksNotFound = [];
	for (const directoryPath of directoriesPath) {
		console.log('Scanning... [', directoryPath, ']');
		let step = 0;
		for (const filePath of walkSync(directoryPath)) {
			const fileTags = await mm.parseFile(filePath.absolute);
			if (fileTags !== undefined && fileTags.native !== undefined && fileTags.native.vorbis !== undefined) {
				const trackId = fileTags.native.vorbis.find((tag) => tag.id === 'SOURCEID').value;
				await request(`https://api.deezer.com/track/${trackId}`, (err, res, body) => {
                    const data = JSON.parse(body);
					console.log(`step ${++step} - ${data.title}`);
					const artists = data.contributors.map((a) => a.name).join(', ');
					const albumArtist = data.artist.name;
					db.query('INSERT INTO dzpartytracksonly_rap (artists, albumArtist, title, title_short, rank, release_date, bpm, trackId) VALUES (?,?,?,?,?,?,?,?)', [artists.normalize('NFD').replace(/[\u0300-\u036f]/g, ''), albumArtist.normalize('NFD').replace(/[\u0300-\u036f]/g, ''), data.title.normalize('NFD').replace(/[\u0300-\u036f]/g, ''), data.title_short.normalize('NFD').replace(/[\u0300-\u036f]/g, ''), data.rank, data.release_date, data.bpm, trackId], (err, res) => {
						if (err) {
							console.log(err);
						}
					});
				});
			} else {
				tracksNotFound.push({
					fileLocation: filePath,
					title: fileTags.common.title,
					artists: fileTags.common.artists,
				});
			}
			await sleep(200);
		}
	}
	fs.writeFileSync('notTaggegTracks.json', JSON.stringify(tracksNotFound));
})();

function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

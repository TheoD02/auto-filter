const fs = require('fs');
const db = require('./db').db;

const fileData = fs.readFileSync('trackData.json');
var sanitize = require('sanitize-filename');
const mm = require('music-metadata');

const files = JSON.parse(fileData);
let totalTracksMoved = 0;
const alreadyMoved = [];

const albumArtistManage = (artist, getArray) => {
	if (artist.match(/, | & /gi) && getArray) {
		return artist.split(/, | & /g);
	}
	return getArray ? [artist] : artist;
};
const tableName = 'dztracksnoparty';
db.query('SELECT * FROM ' + tableName + ' ORDER BY `' + tableName + '`.`artists` ASC', (err, dzTracks) => {
	if (err) {
		console.log(err);
	} else {
		let progress = 0;
		for (const dzTrack of dzTracks) {
			progress++;
			try {
				const searchTrackContainsAtOneLeastArtist = files.filter((f) => {
					const artists = dzTrack.artists.trim() !== '' ? dzTrack.artists.split(/, | & /g) : albumArtistManage(dzTrack.albumArtist, true);
					let countOfFoundedArtist = 0;
					artists.forEach((a) => {
						const splitArtistSpace = a.replace('/', '').replace('\\', '').replace('[', '').replace(']', '').split(' ');
						const splitArtistLength = splitArtistSpace.length;
						const artistRegex = new RegExp(`${splitArtistSpace.join('([ ]+)?([&-_.]+)?([ ]+)?([a-zA-Z]+)?')}`, 'giu');
						const res = f.relative
							.normalize('NFD')
							.replace(/[\u0300-\u036f]/g, '')
							.match(artistRegex);
						if (res) {
							if (splitArtistLength > 5 && res.length > 2) {
								countOfFoundedArtist++;
							} else if (splitArtistLength > 10 && res.length > 4) {
								countOfFoundedArtist++;
							} else if (res.length >= 1) {
								countOfFoundedArtist++;
							}
						}
					});
					if (countOfFoundedArtist !== 0) return f;
				});

				let searchTrackContainsTitle = searchTrackContainsAtOneLeastArtist.filter((f) => {
					const sanitizedTitle = sanitizeTitle(dzTrack.title_short)
						.normalize('NFD')
						.replace(/[\u0300-\u036f]/g, '');
					const splittedTitle = sanitizedTitle.replace(', ').split(' ');
					const splittedTitleLength = splittedTitle.length;
					let countOfWordsFound = 0;
					splittedTitle.forEach((titleElement) => {
						const titleRegex = new RegExp(`${titleElement}`, 'giu');
						if (
							f.relative
								.normalize('NFD')
								.replace(/[\u0300-\u036f]/g, '')
								.match(titleRegex)
						)
							countOfWordsFound++;
					});
					if (countOfWordsFound !== 0) return f;
				});

				if (searchTrackContainsTitle.length > 40) {
					searchTrackContainsTitle = searchTrackContainsAtOneLeastArtist.filter((f) => {
						const sanitizedTitle = sanitizeTitle(dzTrack.title_short)
							.normalize('NFD')
							.replace(/[\u0300-\u036f]/g, '');
						const splittedTitle = sanitizedTitle.split(' ');
						const splittedTitleLength = splittedTitle.length;
						let countOfWordsFound = 0;
						splittedTitle.forEach((titleElement) => {
							const titleRegex = new RegExp(`${titleElement}`, 'giu');
							if (
								f.relative
									.normalize('NFD')
									.replace(/[\u0300-\u036f]/g, '')
									.match(titleRegex)
							)
								countOfWordsFound++;
						});
						if (countOfWordsFound > splittedTitleLength - 1) return f;
					});
				}

				console.log(`${progress} of ${dzTracks.length}`, 'Result for : ', `${dzTrack.artists.trim() !== '' ? dzTrack.artists : dzTrack.albumArtist} - ${sanitizeTitle(dzTrack.title_short)}`);
				console.log(`${progress} of ${dzTracks.length}`, 'Artists found : ', searchTrackContainsAtOneLeastArtist.length);
				totalTracksMoved += searchTrackContainsTitle.length;
				console.log(`${progress} of ${dzTracks.length} Total found : ${searchTrackContainsTitle.length} - Total moved : ${totalTracksMoved}`);
				const clearArtistTitle = `${sanitize(albumArtistManage(dzTrack.albumArtist, false))} - ${sanitize(sanitizeTitle(dzTrack.title_short))}`;
				let copyProgress = 0;
				for (const filePathToCopy of searchTrackContainsTitle) {
					db.query('SELECT * FROM alreadycopied WHERE relativePath = ?', [sanitize(filePathToCopy.relative)], (err, rPathExist) => {
						if (err) {
							throw err;
						}
						if (rPathExist.length !== 0) {
							console.log(`${++copyProgress} of ${searchTrackContainsTitle.length} {Already Copied} -- ${progress} of ${dzTracks.length} Total found : ${searchTrackContainsTitle.length} - Total moved : ${totalTracksMoved} -- ${clearArtistTitle}`);
						} else {
							db.query('INSERT INTO alreadycopied (relativePath) VALUES (?)', [sanitize(filePathToCopy.relative)], (err, relativePath) => {
								const tInfo = mm.parseFile(filePathToCopy.absolute).then((tag) => tag);
								const bitrate = tInfo.format !== undefined && tInfo.format.bitrate !== null ? tInfo.format.bitrate / 1000 : null;
								let directoryPath = `D:\\MMMMMMMM\\${tableName}\\${clearArtistTitle}`;
								if (filePathToCopy.absolute.includes('J:\\scCrap') || filePathToCopy.absolute.includes('J:\\SCTRIE')) {
									directoryPath += '\\SoundCloud';
								} else if (filePathToCopy.absolute.includes('J:\\Musique\\Autres')) {
									directoryPath += '\\Autres';
								} else if (filePathToCopy.absolute.includes('J:\\Musique\\deemix Music')) {
									directoryPath += '\\originalMusic';
								}

								if (bitrate === null) {
									directoryPath += '\\undefinedBitrate';
								} else if (bitrate >= 400) {
									directoryPath += '\\bitrateFlac';
								} else if (bitrate >= 320) {
									directoryPath += '\\bitrate320';
								} else if (bitrate >= 256) {
									directoryPath += '\\bitrate256';
								} else if (bitrate >= 128) {
									directoryPath += '\\bitrate128';
								}

								if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath, { recursive: true });

								const filePath = `${directoryPath}\\${filePathToCopy.relative}`;

								if (!fs.existsSync(filePath)) {
									fs.copyFileSync(filePathToCopy.absolute, filePath);
									alreadyMoved.push(filePathToCopy.absolute);
									console.log(`${++copyProgress} of ${searchTrackContainsTitle.length} {New} -- ${progress} of ${dzTracks.length} Total found : ${searchTrackContainsTitle.length} - Total moved : ${totalTracksMoved} -- ${clearArtistTitle}`);
								} else {
									console.log(`${++copyProgress} of ${searchTrackContainsTitle.length} {Already present} -- ${progress} of ${dzTracks.length} Total found : ${searchTrackContainsTitle.length} - Total moved : ${totalTracksMoved} -- ${clearArtistTitle}`);
								}
							});
						}
					});
				}
			} catch (e) {
				console.log(e);
			}
		}
	}
});

const sanitizeTitle = (title) => {
	if (title === undefined) return null;
	if (title.includes('(')) {
		const charIndex = title.indexOf('(');
		title = title.substring(0, charIndex).trim();
	} else if (title.includes('[')) {
		const charIndex = title.indexOf('[');
		title = title.substring(0, charIndex).trim();
	}
	return title;
};

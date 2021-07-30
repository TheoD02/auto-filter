const recursive = require('recursive-readdir');
const fs = require('fs');

/**
 * Chemin d'accès à analyser.
 */
const directoriesPath = [
	'C:\\Users\\Theo\\Music\\TRIE 2020 (SEPTEMBRE)',
	'J:\\Musique',
	/* 	'J:\\SCTRIE\\musics (100-1000000 listen & 5-25 likes)',
	'J:\\SCTRIE\\musics (100-1000000 listen & 25-50 likes)', */
	/* 'J:\\SCTRIE\\musics (500-1000000 listen & 50-5000 likes)', */
	/* 	'J:\\SCTRIE\\musics (500-1000000 listen & 5000-10000 likes)',
	'J:\\SCTRIE\\musics (500-1000000 listen & 10000-999999999 likes)', */
];

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
let files = [];
(async () => {
    console.log('Stating scan...');
	for (const directoryPath of directoriesPath) {
        console.log('Scanning... [', directoryPath , ']');
		files = [...files, ...walkSync(directoryPath)];
	}
	fs.writeFileSync('trackData.json', JSON.stringify(files));
	console.log(files.length, 'trouvée');
})();

const fs = require('fs');
const childProcess = require('child_process');
const util = require('util');

const Path = require('path');
const mkdirp = require('mkdirp');
const Vinyl = require('vinyl');
const del = require('del');
const gulp = require('gulp');
const unzip = require('unzipper');
const combinedStream = require('combined-stream');
const fileExists = require('file-exists');
const request = require('request');
const rimraf = require('rimraf');

const exec = require('gulp-exec');
const watch = require('gulp-watch');
const rename = require('gulp-rename');
const through2 = require('through2');
const gutil = require('gulp-util');
const changed = require('gulp-changed');
const gulpZip = require('gulp-zip');

const config = require('./config.json');
const package = require('./package.json');


gulp.task('gen-default-config', function (callback) {
  fs.writeFile(Path.join(__dirname, 'config.json'), {
    binaries: {
      moonc: '',
      tiled: '',
      aseprite: '',
      love: '',
      butler: ''
    }
  }, 'utf8', callback);
});

gulp.task('build:lua', function () {
  return gulp.src('src/**/*.lua')
    .pipe(changed('build'))
    .pipe(gulp.dest('build'));
});

gulp.task('build:other-assets', function () {
  return gulp.src([
    'data/**/*',
    // If you add any new asset pipelines, make sure to add ignore blobs for their extensions here
    '!data/**/*.tmx',
    '!data/**/*.ase'
  ])
    .pipe(changed('build/data'))
    .pipe(gulp.dest('build/data'));
});

gulp.task('build:moon', function () {
  const moonSources = gulp.src(['src/**/*.moon'], { read: false });
  const luaOut = moonSources
    .pipe(changed('build', { extension: '.lua' }))
    .pipe(exec(`"${config.binaries.moonc}" -p "<%= file.path %>"`, { pipeStdout: true }))
    .pipe(exec.reporter({ stdout: false }))
    .pipe(rename(path => { path.extname = '.lua'; }));

  return luaOut.pipe(gulp.dest('build'));
});

gulp.task('build:tiled', function () {
  return gulp.src('**/*.tmx', { read: false })
    .pipe(changed('build', { extension: '_tmx.lua' }))
    .pipe(rename(path => {
      path.basename += '_tmx';
      path.extname = '.lua';
      path.dirname = 'build/' + path.dirname;
    }))
    .pipe(through2.obj(function (file, enc, callback) {
      mkdirp(Path.dirname(file.path), (err) => callback(err, file));
    }))
    .pipe(through2.obj(function (file, enc, callback) {
      const that = this;

      childProcess.exec(
        `"${config.binaries.tiled}" --export-map "${file.history[file.history.length - 2]}" "${file.history[file.history.length - 1]}"`,
        {
          env: process.env
        },
        function (err, stdout, stderr) {
          if (err) {
            gutil.log(stderr);
            callback(err);
            return;
          }
          callback(null, file);
        }
      );
    }));
});

function parsePath(path) {
  var extname = Path.extname(path);
  return {
    dirname: Path.dirname(path),
    basename: Path.basename(path, extname),
    extname: extname
  };
}

gulp.task('build:aseprite', function () {
  return gulp.src('**/*.ase', { read: false })
    .pipe(changed('build', { extension: '.ase.png' }))
    .pipe(rename(path => {
      path.dirname = 'build/' + path.dirname;
    }))
    .pipe(through2.obj(function (file, enc, callback) {
      const path = parsePath(file.path);
      const pngPath = Path.join(path.dirname, path.basename + path.extname + '.png');
      const jsonPath = Path.join(path.dirname, path.basename + path.extname + '.json');

      file.pngFile = new Vinyl({ path: pngPath });
      file.jsonFile = new Vinyl({ path: jsonPath });
      mkdirp(Path.dirname(file.path), (err) => callback(err, file));
    }))
    .pipe(through2.obj(function (file, enc, callback) {
      const that = this;

      childProcess.exec(
        `"${config.binaries.aseprite}" -b --list-tags --format json-array "${file.history[file.history.length - 2]}" --sheet "${file.pngFile.path}" --data "${file.jsonFile.path}"`,
        {
          env: process.env
        },
        function (err, stdout, stderr) {
          if (err) {
            gutil.log(stderr);
            callback(err);
            return;
          }
          that.push(file.pngFile);
          that.push(file.jsonFile);
          callback();
        }
      );
    }));
});

gulp.task('clean', function () {
  return del([
    'build/**/*',
    'build',
    '*.love',
    'dist-win',
    'dist-mac',
    'dist-linux'
  ]);
});

gulp.task('build', [
  'build:lua',
  'build:moon',
  'build:tiled',
  'build:aseprite',
  'build:other-assets'
]);

gulp.task('run', function (callback) {
  const proc = childProcess.spawn(config.binaries.love, ['build'], {
  });

  proc.stdout.on('data', (data) => gutil.log(data.toString()));
  proc.stderr.on('data', (data) => gutil.log(data.toString()));

  proc.on('error', function (err) {
    gutil.log(err);
  });
  proc.on('exit', function (code) {
    if (code !== 0) {
      callback(new gutil.PluginError('gulp-run-love', `error code ${code}`));
      return;
    }
    callback();
  });
});

gulp.task('default', ['build']);

gulp.task('watch', ['build'], function () {
  return gulp.watch([
    '**/*.moon',
    '**/*.lua',
    '**/*.tmx',
    '**/*.ase',
    '**/*.wav'
  ], ['build']);
});

gulp.task('dist:zip', ['build'], function () {
  return gulp.src(['build/**/*', '!build/genobjectxml.lua'])
    .pipe(gulpZip(`${package.name}.love`))
    .pipe(gulp.dest('.'));
});

gulp.task('dist:win:download-love', function (callback) {
  fileExists(Path.join(__dirname, 'dist-win', 'love.zip'), (err, exists) => {
    if (err) {
      callback(err);
      return;
    }

    if (exists) {
      gutil.log('love.zip exists; skipping');
      callback();
      return;
    }

    gutil.log('downloading love.zip...');
    mkdirp(Path.join(__dirname, 'dist-win'), (err) => {
      if (err) {
        callback(err);
        return;
      }
      const req = request('https://bitbucket.org/rude/love/downloads/love-0.10.2-win32.zip').pipe(fs.createWriteStream(Path.join(__dirname, 'dist-win', 'love.zip')));
      req.on('close', () => callback());
      req.on('error', (e) => callback(e));
    });
  });
});

gulp.task('dist:win:extract-love', ['dist:win:download-love'], function (callback) {
  // If an old dist dir exists, delete it
  rimraf(Path.join(__dirname, 'dist-win', 'dist'), () => {
    // ignore errors silently

    let zipFileStream = fs.createReadStream(Path.join(__dirname, 'dist-win', 'love.zip'));
    let unzipStream = zipFileStream.pipe(unzip.Extract({path: Path.join(__dirname, 'dist-win')}));
    unzipStream.on('close', () => {
      setTimeout(() => {
        // We need the delay to ensure the unzip actually finishes writing...
        fs.rename(Path.join(__dirname, 'dist-win', 'love-0.10.2-win32'), Path.join(__dirname, 'dist-win', 'dist'), (err) => {
          if (err) {
            return callback(err);
          }
          callback();
        });
      }, 100);
    });
    unzipStream.on('error', (e) => {
      unzipStream.end();
      callback(e);
    });
  });
});

gulp.task('dist:win:fused', ['dist:zip', 'dist:win:extract-love'], function (callback) {
  let loveExeStream = fs.createReadStream(Path.join(__dirname, 'dist-win', 'dist', 'love.exe'));
  let packageStream = fs.createReadStream(Path.join(__dirname, `${package.name}.love`));
  let destination = Path.join(__dirname, 'dist-win', 'dist', `${package.name}.exe`);
  let combine = combinedStream.create();
  combine.append(loveExeStream);
  combine.append(packageStream);

  let out = combine.pipe(fs.createWriteStream(destination));
  out.on('close', () => {
    fs.unlink(Path.join(__dirname, 'dist-win', 'dist', 'love.exe'), (e) => {
      if (e) {
        return callback(e);
      }
      fs.unlink(Path.join(__dirname, 'dist-win', 'dist', 'lovec.exe'), (e) => {
        if (e) {
          return callback(e);
        }
        callback();
      });
    });
  });
  out.on('error', (e) => {
    callback(e);
  });
});

gulp.task('dist:win:itch-toml', ['dist:win:fused'], function (callback) {
  const cpItch = fs.createReadStream(Path.join(__dirname, 'dist/win/.itch.toml')).pipe(fs.createWriteStream(Path.join(__dirname, 'dist-win/dist/.itch.toml')));
  cpItch.on('close', () => callback());
  cpItch.on('error', (e) => callback(e));
});

gulp.task('dist:win', ['dist:win:itch-toml']);

gulp.task('dist:mac:download-love', function (callback) {
  fileExists(Path.join(__dirname, 'dist-mac', 'love.zip'), (err, exists) => {
    if (err) {
      callback(err);
      return;
    }

    if (exists) {
      gutil.log('love.zip exists; skipping');
      callback();
      return;
    }

    gutil.log('downloading love.zip...');
    mkdirp(Path.join(__dirname, 'dist-mac'), (err) => {
      if (err) {
        callback(err);
        return;
      }
      const req = request('https://bitbucket.org/rude/love/downloads/love-0.10.2-macosx-x64.zip').pipe(fs.createWriteStream(Path.join(__dirname, 'dist-mac', 'love.zip')));
      req.on('close', () => callback());
      req.on('error', (e) => callback(e));
    });
  });
});

gulp.task('dist:mac:extract-love', ['dist:mac:download-love'], function (callback) {
  // If an old dist dir exists, delete it
  rimraf(Path.join(__dirname, 'dist-mac', 'dist'), () => {
    // ignore errors silently

    let zipFileStream = fs.createReadStream(Path.join(__dirname, 'dist-mac', 'love.zip'));
    let unzipStream = zipFileStream.pipe(unzip.Extract({path: Path.join(__dirname, 'dist-mac')}));
    unzipStream.on('close', () => {
      mkdirp(Path.join(__dirname, 'dist-mac', 'dist'), (err) => {
        if (err) {
          return callback(err);
        }

        fs.rename(Path.join(__dirname, 'dist-mac', 'love.app'), Path.join(__dirname, 'dist-mac', 'dist', `${package.name}.app`), (err) => {
          if (err) {
            return callback(err);
          }
          callback();
        });
      });
    });
    unzipStream.on('error', (e) => {
      unzipStream.end();
      callback(e);
    });
  });
});

gulp.task('dist:mac:fused', ['dist:mac:extract-love', 'dist:zip'], function (callback) {
  let packageStream = fs.createReadStream(Path.join(__dirname, `${package.name}.love`)).pipe(fs.createWriteStream(Path.join(__dirname, 'dist-mac', 'dist', `${package.name}.app`, 'Contents', 'Resources', `${package.name}.love`)));
  packageStream.on('close', () => {
    let plistStream = fs.createReadStream(Path.join(__dirname, 'dist', 'mac', 'Info.plist')).pipe(fs.createWriteStream(Path.join(__dirname, 'dist-mac', 'dist', `${package.name}.app`, 'Contents', 'Info.plist')));
    plistStream.on('close', () => {
      let itchTomlStream = fs.createReadStream(Path.join(__dirname, 'dist', 'mac', '.itch.toml')).pipe(fs.createWriteStream(Path.join(__dirname, 'dist-mac', 'dist', '.itch.toml')));
      itchTomlStream.on('close', () => {
        callback();
      });
      itchTomlStream.on('error', e => callback(e));
    });
    plistStream.on('error', e => callback(e));
  });
  packageStream.on('error', e => callback(e));
});

gulp.task('dist:mac', ['dist:mac:fused']);

gulp.task('dist:linux', ['dist:zip'], function (callback) {
  mkdirp(Path.join(__dirname, 'dist-linux'), (err) => {
    if (err) {
      callback(err);
      return;
    }
    let packageStream = fs.createReadStream(Path.join(__dirname, `${package.name}.love`)).pipe(fs.createWriteStream(Path.join(__dirname, 'dist-linux', `${package.name}.love`)));
    packageStream.on('close', () => callback());
    packageStream.on('error', e => callback(e));
  });
});

gulp.task('dist', ['dist:win', 'dist:mac', 'dist:linux']);

gulp.task('publish:win', ['dist:win'], function (callback) {
  const proc = childProcess.spawn(config.binaries.butler, ['push', 'dist-win/dist', `${package.vore.butler.game}:windows`], {
  });

  proc.stdout.on('data', (data) => gutil.log(data.toString()));
  proc.stderr.on('data', (data) => gutil.log(data.toString()));

  proc.on('error', function (err) {
    callback(err);
  });
  proc.on('exit', function (code) {
    if (code !== 0) {
      callback(new gutil.PluginError('gulp-butler-publish', `error code ${code}`));
      return;
    }
    callback();
  });
});

gulp.task('publish:mac', ['dist:mac'], function (callback) {
  const proc = childProcess.spawn(config.binaries.butler, ['push', 'dist-mac/dist', `${package.vore.butler.game}:mac-osx`], {
  });

  proc.stdout.on('data', (data) => gutil.log(data.toString()));
  proc.stderr.on('data', (data) => gutil.log(data.toString()));

  proc.on('error', function (err) {
    callback(err);
  });
  proc.on('exit', function (code) {
    if (code !== 0) {
      callback(new gutil.PluginError('gulp-butler-publish', `error code ${code}`));
      return;
    }
    callback();
  });
});

gulp.task('publish:linux', ['dist:linux'], function (callback) {
  const proc = childProcess.spawn(config.binaries.butler, ['push', 'dist-linux', `${package.vore.butler.game}:linux`], {
  });

  proc.stdout.on('data', (data) => gutil.log(data.toString()));
  proc.stderr.on('data', (data) => gutil.log(data.toString()));

  proc.on('error', function (err) {
    callback(err);
  });
  proc.on('exit', function (code) {
    if (code !== 0) {
      callback(new gutil.PluginError('gulp-butler-publish', `error code ${code}`));
      return;
    }
    callback();
  });
});

gulp.task('publish', ['publish:win', 'publish:mac', 'publish:linux']);

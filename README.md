# Vore

**Vore** is a [Love] game template leveraging Node ecosystem libraries like [gulp] to power an end-to-end build pipeline for both game code and assets.

[Love]: https://love2d.org/
[gulp]: https://gulpjs.com/

## Features

- Automatic build of [Aseprite] sources from `data` directory into .png/.json pairs for game use
- Automatic build of [Tiled] map sources from `data` directory into .lua tables
- All other `data` files merged into build output as-is
- Automatic build of [Moonscript] sources from `src` directory. `moon` and `lua` files can coexist in same package path.
- Merging of Moonscript and Lua sources to single path in build output
- Distribution packaging for Windows and macOS, and standalone .love
- Publishing via [Butler] to [itch.io]; linux published as .love archive
- Supports Windows, macOS, and Linux build environments.
- "Watch" mode instantly rebuilds any asset or source file as it's changed

[Aseprite]: https://www.aseprite.org/
[Tiled]: http://www.mapeditor.org/
[Moonscript]: http://moonscript.org/
[Butler]: https://itch.io/docs/butler/
[itch.io]: https://itch.io/

## Getting started

Download the contents of this repository and extract it into a new folder.

Make sure you have the following installed:

- [Node] 8.9 or later, including npm
- [Love]

These are optional, so long as you don't have files corrosponding to their formats in the data dir or use the `publish` command:

- [Tiled]
- [Aseprite]
- [Moonscript]; via LuaRocks is best
- [Butler]

Choose a name for your project, and edit the following files to use that name:

- `package.json` -- Change "name" key and "vore.butler.name" key if you want butler publishing support
- `dist/mac/.itch.toml` -- Change "path" key 
- `dist/mac/Info.plist` -- Edit the CFBundleIdentifier to your own domain path, or at least something unique
- `dist/win/.itch.toml` -- Change "path" key to match the exact name from `package.json`

Now run the following to install the npm dependencies

```
npm install -g gulp-cli
npm install
```

Next, use gulp to generate a default `config.json`. Do this on every development computer, _and do not check `config.json` in to version control_.

```
gulp gen-default-config
```

You will need to edit the newly generated `config.json` and point it to the appropriate paths for each binary. Leave blank if it's optional and you don't want to use it. These are the _full_ command paths, do not rely on shell PATH!

Create these directories for your project

```
mkdir data
mkdir src
```

Your `moon` and `lua` sources will go in `src`, and everything else goes in `data`. In game, the compiled output of `data` will be present at `data` as well, so e.g. you can `require` the Tiled maps at `data.maps.yourmap_tmx`.

[Node]: https://nodejs.org/en/

## Building and running your game

You can use the following command to build your game code and assets:

```
gulp build
```

Then, enter watch mode:

```
gulp watch
```

And, using the `love` exe path in your `config.json`, you can run love with:

```
gulp run
```

You can run `watch` and `run` at the same time if your game supports hot reloading.


## Q/A

- **Why _vore_?** it vores your assets don't ask
- **Can I add my own asset types?** If the tool has a batch output mode or you have some processing that can be done in JS, sure.

# License

This is released to the public domain under the CC0 license.

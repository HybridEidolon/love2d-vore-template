# SystemReload for tiny-ecs

SystemReload can be used to automatically reinitialize systems during runtime.
It works by checking a set of file paths on an interval for updates, and rerunning
a lua chunk that exports a function for setting up world systems. It requires
the lua require path be unmodified from love2d's default.

Bootstrapping your world in `main.moon`:

    world = tiny.world!

    initSystems = require 'initsystems'
    initSystems world

Inside `initsystems.moon`:

    (world) ->
      SystemReload = require 'tinyx.SystemReload'
      systemInitModule = 'initsystems'
      moduleRoots = {'systems', 'tinyx', 'sub.path'}

      world\addSystem (SystemReload systemInitModule, moduleRoots)

Your systems' internal state will be destroyed on reload. This is vitally important
to understand; you should never assume onAdd/onRemove will only ever be called once
or a given entity at runtime, because the systems themselves get recreated. If you
need things to only happen once, store that information on the entity itself.

Second, do not store references to systems or system data inside your entities'
components. This will easily break hot reloading at runtime. You need to make sure
that whatever is used to index system-specific data is only stored as a handle
or index that can be recreated by that system; alternatively, on the system's
removal, delete those handles so that the next version of the system can recreate them.
If there is data that should persist between reloads, is not pure Lua data, and
isn't tied to a specific entity (e.g. an asset manager), store it on the world
object because the world itself will persist between reloads.

For example: instead of storing an Image directly in an entity for use by your system
that handles rendering, store the string path to that resource in the entity, have a
system manage loading that asset into a world-global asset manager, then index into
the asset manager in the render system when looking at that component again.

Essentially, you need to make your systems as functionally pure as possible, and stick
any transient state into the world itself.

Bonus: if you keep your systems pure and entities pure-data, you can create systems
that manage unique IDs for each entity. You can then have references to other entities
in such a way that saving your game state for debugging becomes as simple as serializing
a table of every entity table in your world.

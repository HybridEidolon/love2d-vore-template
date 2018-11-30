System = require 'tinyx.System'

local *

-- SystemReload can be used to automatically reinitialize systems during runtime.
-- It works by checking a set of file paths on an interval for updates, and rerunning
-- a lua chunk that exports a function for setting up world systems. It requires
-- the lua require path be unmodified from love2d's default.

-- Example:
-- systemInitModule = 'initsystems'
-- moduleRoots = {'system', 'tinyx', 'sub.path'}
--
-- Your systems' internal state will be destroyed on reload.

lfs = love.filesystem
getDirectoryItems = lfs.getDirectoryItems
getInfo = lfs.getInfo

startsWith = (s, sub) -> (s\find sub, 0, true) != nil
endsWith = (s, sub) -> (s\find sub, -sub\len!, true) != nil

enumerateRecursive = (path, tree) ->
  pathInfo = getInfo path
  tree[#tree + 1] = {path: path, type: pathInfo.type, modtime: pathInfo.modtime}

  files = getDirectoryItems(path)
  for i, f in ipairs files
    fname = path .. '/' .. f
    info = getInfo fname
    if info.type == 'directory'
      tree = enumerateRecursive fname, tree
    else
      if endsWith fname, '.lua'
        tree[#tree + 1] = {path: fname, type: info.type, modtime: info.modtime}

  tree

class SystemReload extends System
  new: (@systemInitModule, @moduleRoots, @reload = true, @reloadInterval = 1) =>
    super!
    @interval = @reloadInterval

  onAddToWorld: (world) =>
    @initLastModified = (getInfo @systemInitModule).modtime
    @files = {}

    for i, v in ipairs @moduleRoots
      pathRoot = v\gsub '.', '/'
      @files = enumerateRecursive pathRoot, @files

  update: =>
    initLastModified = (getInfo @systemInitModule).modtime
    if initLastModified != @initLastModified
      @\reload!
      return

    for i, v in ipairs @files
      info = getInfo v.name
      if info == nil or info.modtime != v.modtime
        @\reload!
        return


  reload: =>
    @world\clearSystems!
    for _, root in ipairs @moduleRoots
      for pkgname, _ in pairs package.loaded
        if startsWith pkgname, root
          package.loaded[pkgname] = nil

    package.loaded[@systemInitModule] = nil

    initSystems = require @systemInitModule
    initSystems @world

SystemReload

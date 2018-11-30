System = require 'tinyx.System'

local *

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
    initInfo = getInfo @systemInitModule\gsub('\\.', '/') .. '.lua'
    if initInfo == nil
      error 'missing system init module ' .. @systemInitModule\gsub('\\.', '/') .. '.lua'
    @initLastModified = initInfo.modtime
    @files = {}

    for i, v in ipairs @moduleRoots
      pathRoot = v\gsub '.', '/'
      @files = enumerateRecursive pathRoot, @files

  update: =>
    initLastModified = (getInfo @systemInitModule\gsub('\\.', '/') .. '.lua').modtime
    if initLastModified != @initLastModified
      @\reloadSystems!
      return

    for i, v in ipairs @files
      info = getInfo v.path
      if info == nil or info.modtime != v.modtime
        @\reloadSystems!
        return


  reloadSystems: =>
    @world\clearSystems!
    for _, root in ipairs @moduleRoots
      for pkgname, _ in pairs package.loaded
        if startsWith pkgname, root
          package.loaded[pkgname] = nil

    package.loaded[@systemInitModule] = nil

    initSystems = require @systemInitModule
    initSystems @world

SystemReload

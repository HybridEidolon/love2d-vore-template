System = require 'tinyx.System'
tiny = require 'tiny'

class SortedSystem extends System
  new: =>
    @ = tiny.sortedSystem

  -- compare: (e1, e2) =>

SortedSystem

import System from require 'systems.System'
tiny = require 'tiny'

class SortedProcessingSystem extends System
  new: =>
    @ = tiny.sortedProcessingSystem @

  -- compare: (e1, e2) =>
  -- process: (e, dt) =>
  -- preProcess: (dt) =>
  -- postProcess: (dt) =>

{:SortedProcessingSystem}

System = require 'tinyx.System'
tiny = require 'tiny'

class ProcessingSystem extends System
  new: =>
    @ = tiny.processingSystem @

  -- process: (e, dt) =>
  -- preProcess: (dt) =>
  -- postProcess: (dt) =>

ProcessingSystem

import System from require 'systems.System'
tiny = require 'tiny'

class ProcessingSystem extends System
  new: =>
    @ = tiny.processingSystem @

  -- process: (e, dt) =>
  -- preProcess: (dt) =>
  -- postProcess: (dt) =>

{:ProcessingSystem}

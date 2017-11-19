if love.filesystem then
    require 'rocks' ()
end

function love.conf(t)
    t.version = '0.10.2'

    t.rocks_tree = 'build/rocks'
    t.dependencies = {
        'lunajson ~> 1.2' -- optional, just added as example
    }
end

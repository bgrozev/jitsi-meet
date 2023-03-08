local address = "visitors." .. module.host

-- Advertise the component for discovery via disco#items
module:add_identity('component', 'visitors', address);

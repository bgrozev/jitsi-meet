module:log('info', 'Starting visitors_component at %s', module.host);

local jid_split = require "util.jid".split;
local jid_bare = require "util.jid".bare;

local function stanza_handler(event)
	local origin, stanza = event.origin, event.stanza
	module:log("info", "received stanza from %s session", origin.type)

	local bare_from = jid_bare(stanza.attr.from);
	local to = stanza.attr.to;

	module:log("info", "xxx bare_from=%s, to=%s,  module.host=%s", bare_from, to, module.host);
	if to == module.host then
	    module:log("info", "xxx to us");
	else
	    module:log("info", "xxx to someone else");
	end
	return true
end

module:hook("iq/host", stanza_handler, -1);

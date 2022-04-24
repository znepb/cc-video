local render = require("render")
local host = "ws://127.0.0.1:5556"
local ws, err = http.websocket(host)
local mon = peripheral.wrap("monitor_0")
mon.setTextScale(0.5)
print(ws, err)

ws.send(textutils.serializeJSON({
  subscription = "video"
}))

local queue = {}

parallel.waitForAll(function()
  while true do
    local e, url, message, bin = os.pullEvent()

    if e == "websocket_message" then
      if url == host then
        local start = os.epoch("utc")
        local proper = message:gsub(string.char(194), "")
        local start2 = os.epoch("utc")

        if message then
          table.insert(queue, {
            at = tonumber(proper:sub(1, 32)),
            frame = proper:sub(33, -1)
          })
        end
      end
    end
  end
end, function()
  while true do
    local now = os.epoch("utc")
    local current = queue[1]
    local skipThereshold = 500

    if current then
      local start = os.epoch("utc")
      if current.at + skipThereshold > now and current.at - skipThereshold < now then
        render(current.frame, mon)
        table.remove(queue, 1)
      elseif current.at < now then
        print("FRAME SKIPPED", now - current.at)
        queue = {}
      end
      print("render", os.epoch("utc") - start)
    end
    sleep()
  end
end)

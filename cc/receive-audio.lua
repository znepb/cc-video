local connect = "ws://127.0.0.1:5556"

local aukit = require("aukit")
local peripherals = peripheral.getNames()
local speakers = {}
local lastAudio = 0
local isFirstPacket = true

for i, v in pairs(peripherals) do
  if peripheral.getType(v) == "speaker" then
    table.insert(speakers, v)
  end
end

print(#speakers)

local ws, err = http.websocket(connect)
print(ws, err)

local welcomePacket
local firstPacketId = -1

ws.send(textutils.serializeJSON({
  subscription = "audio"
}))

local queue = {}

local samples_i, samples_n = 1, 48000
local samples = {}
for i = 1, samples_n do samples[i] = 0 end

local function playFirstInQueue()
  local current = queue[1]
  local now = os.epoch("utc")
  print("play audio", now - current.at)
  isFirstPacket = false

  local ok, err = pcall(function()
    local data = aukit.stream.pcm(current.data, 8, "unsigned", 1, 48000, false, true)
    aukit.play(data, function() end, 10, peripheral.find("speaker"))
  end)



  table.remove(queue, 1)
end

parallel.waitForAny(function()
  while true do
    local e = {os.pullEvent()}

    if e[1] == "websocket_message" then
      local url, msg, bin = e[2], e[3], e[4]
      print("MSG")

      if bin == false then
        local data = textutils.unserializeJSON(msg)

        if data.e == "welcome" then
          print("Got welcome")
          welcomePacket = data.d
          print("BPC is " .. data.d.bpc)
        end
      else
        print("receive audio", #msg, msg:sub(1, 32))

        table.insert(queue, {
          at = tonumber(msg:sub(1, 32)),
          data = msg:sub(33, -1)
        })

      end
    elseif e[1] == "websocket_closed" then
      local url, reason = e[2], e[3]

      if url == connect then
        print("WS closed: " .. reason)
        break
      end
    end
  end
end, function()
  while true do
    local now = os.epoch("utc")
    local current = queue[1]
    local skipThreshold = 100

    if current then
      if isFirstPacket and current.at < now and current.at + 1000 > now then
        playFirstInQueue()
        isFirstPacket = false
      elseif not isFirstPacket and current.at < now + 200 and current.at + 200 > now then
        playFirstInQueue()
      end
    end
    sleep()
  end
end)

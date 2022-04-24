-- for version 2
local width = 164

return function (data, t)
  for i = 0, 15 do
    t.setPaletteColour(2 ^ i,  tonumber(data:sub(i * 8 + 1, i * 8 + 8)))
  end

  t.clear()

  local height = (#data - 128) / width / 3

  for i = 0, height - 1 do
    local segStart = 129 + (i * 3 * width)
    local c = data:sub(segStart, segStart + width)
    local b = data:sub(segStart + width, segStart + width * 2)
    local f = data:sub(segStart + width * 2, segStart + width * 3)
    if #f < width + 1 then
      f = f .. "0"
    end

    t.setCursorPos(1, i + 1)
    t.blit(c, b, f)
  end
end
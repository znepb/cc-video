const ws = require("nodejs-websocket");
const express = require("express");
const fs = require("fs");
const { toCC } = require("./src/toCC");
const { OPEN } = require("ws");
const app = express();
const zeroPad = (num, places) => String(num).padStart(places, "0");

let isRunning = false;

const frameQueue = [];
const bpc = 48000 * 2;

function sendSlice(slice, at) {
  console.log("Send audio, length ", slice.length);
  server.connections.forEach((conn) => {
    if (conn.readyState === OPEN) {
      if (conn.subscription == "audio") {
        const header = Buffer.alloc(32);
        header.write(zeroPad(at, 32));

        const chunkWithHeader = Buffer.concat(
          [header, slice],
          header.length + slice.length
        );

        console.log("audio send");
        conn.sendBinary(chunkWithHeader);
      }
    }
  });
}

const server = ws
  .createServer((conn) => {
    console.log("New conn");
    conn.on("close", (e, e2, e3) => {
      console.warn("conn closed", e, e2);
    });
    conn.on("error", (e) => {
      console.warn("error " + e);
    });
    conn.on("text", (e) => {
      const info = JSON.parse(e);
      console.log("got");

      if (info) {
        console.log(info);
        if (info.subscription == "audio") {
          conn.subscription = "audio";
          console.log("client sub audio");
        } else if (info.subscription == "video") {
          conn.subscription = "video";
          console.log("client sub video");
        }
      }
    });
  })
  .listen(5556);

app.get("/play/:video", (req, res) => {
  if (req.params.video && !isRunning) {
    isRunning = true;
    if (fs.existsSync("videos/" + req.params.video)) {
      res.send("OK");
      console.log("begin");

      const video = req.params.video;

      const list = fs.readdirSync(`videos/${req.params.video}/frames/`);

      let index = 0;
      let renderIndex = 0;
      let audioIndex = 0;
      const data = fs.readFileSync(`videos/${req.params.video}/audio.raw`);

      setInterval(() => {
        if (frameQueue[0]) {
          console.log("Send frame", index);

          const time = Number(new Date());
          const frame = frameQueue[0];
          const at = time + 1000;

          server.connections.forEach((conn) => {
            if (conn.readyState === OPEN) {
              if (conn.subscription == "video") {
                const header = Buffer.alloc(32);
                header.write(zeroPad(at, 32));
                const chunkWithHeader = Buffer.concat([
                  header,
                  Buffer.from(frame),
                ]);
                conn.sendBinary(chunkWithHeader);
              }
            }
          });
          frameQueue.shift();

          if ((index + 10) % 20 === 0) {
            console.log("Send audio");

            sendSlice(
              data.slice(((index + 10) / 20) * bpc, ((index + 30) / 20) * bpc),
              at + 10 * 100
            );
          } else if (index === 0) {
            console.log("Send audio");

            sendSlice(
              data.slice((index / 20) * bpc, ((index + 20) / 20) * bpc),
              at
            );
          }

          index++;
        }
      }, 100);

      setInterval(async () => {
        const file = list[renderIndex];
        if (frameQueue.length < 20) {
          frameQueue.push(
            await toCC(
              `videos/${video}/frames/${file}`,
              `videos/${video}/palletes/pallete-${parseInt(
                file.match(/K(\d*)/)[0].replace("K", "")
              )}.png`
            )
          );
          //console.log("Render", renderIndex);
          renderIndex++;
        }
      }, 25);
    } else {
      res.sendStatus(404);
      isRunning = false;
    }
  } else {
    res.send("Failed");
  }
});

app.listen(5555);

const args = process.argv.slice(2);
const file = args.join(" ");
const ffmpeg = require("fluent-ffmpeg");

new ffmpeg(file)
  .noVideo()
  .on("error", (e) => {
    console.log(e);
  })
  .on("end", () => {
    console.log("done");
    new ffmpeg("./.temp/audio.wav")
      .audioFrequency(48000)
      .audioChannels(1)
      .audioCodec("pcm_u8")
      .noVideo()
      .format("u8")
      .save("./.temp/audio.raw")
      .run();
  })
  .save("./.temp/audio.wav");

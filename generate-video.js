const args = process.argv.slice(2);
const file = args.join(" ");

const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
let getPalletesHasRun = false;

let expectedSegments = 0;
let completedSegments = 0;

const zeroPad = (num, places) => String(num).padStart(places, "0");
function mkdir(d) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d);
  }
}
function chunkArray(array, chunkSize) {
  return Array.from(
    { length: Math.ceil(array.length / chunkSize) },
    (_, index) => array.slice(index * chunkSize, (index + 1) * chunkSize)
  );
}

function downscale() {
  mkdir(".temp");
  mkdir(".temp/mp4clip");
  mkdir(".temp/palletes");
  mkdir(".temp/gifclip");
  mkdir(".temp/frames");
  mkdir(".temp/fragments");
  ffmpeg(file)
    .FPSOutput(10)
    .size("328x?")
    .save(".temp/downscaled.mp4")
    .on("end", split);
}

function split() {
  console.log("Splitting");
  ffmpeg(".temp/downscaled.mp4")
    .addOption("-map 0")
    .addOption("-c copy")
    .addOption("-f segment")
    .addOption("-segment_time 0.2")
    .addOption("-reset_timestamps 1")
    .save(".temp/mp4clip/clip%03d.mp4")
    .on("end", getPalletes)
    .run();
}

function getPalletes() {
  if (getPalletesHasRun) return;
  getPalletesHasRun = true;
  console.log("Generating palletes");
  const files = fs.readdirSync(".temp/mp4clip/");

  files.forEach((f, i) => {
    expectedSegments += 1;
    ffmpeg(`./.temp/mp4clip/${f}`)
      .videoFilter("palettegen=max_colors=16")
      .on("end", () => {
        genGif(f, i);
      })
      .save(`./.temp/palletes/pallete-${i}.png`);
  });
  console.log("Generation done");
}

function genGif(f, i) {
  ffmpeg(`./.temp/mp4clip/${f}`)
    .addInput(`./.temp/palletes/pallete-${i}.png`)
    .addOption(`-lavfi paletteuse`)
    .on("error", (e) => {
      console.log("err", e);
    })
    .on("end", () => {
      let frames = 0;
      ffmpeg(`./.temp/gifclip/clip-${i}.gif`)
        .addOption("-vsync 0")
        .on("end", (e) => {
          completedSegments++;
        })
        .save(`./.temp/frames/frame-K${zeroPad(i, 3)}-F%03d.png`);
    })
    .save(`./.temp/gifclip/clip-${i}.gif`);
}

downscale();

console.log("Downscaling & modifying FPS");

const { color } = require("jimp");
const Jimp = require("jimp");
const { decimalToRGB, deltaE, rgbToDecimal } = require("../src/colorfunctions");
const fs = require("fs");
const zeroPad = (num, places) => String(num).padStart(places, "0");

function chunkArray(array, chunkSize) {
  return Array.from(
    { length: Math.ceil(array.length / chunkSize) },
    (_, index) => array.slice(index * chunkSize, (index + 1) * chunkSize)
  );
}

function calcClosest(compareTuple, to) {
  const color1 = decimalToRGB(compareTuple[0]);
  const color2 = decimalToRGB(compareTuple[1]);
  const toRGB = decimalToRGB(to);

  const color1deltaE = deltaE(color1, toRGB);
  const color2deltaE = deltaE(color2, toRGB);

  if (color1deltaE < color2deltaE) {
    return compareTuple[0];
  } else {
    return compareTuple[1];
  }
}

function generateMatrix(tl, tr, l, r, bl, br) {
  const matrixColors = {};

  matrixColors[tl] = 1;
  if (matrixColors[tr]) matrixColors[tr] += 1;
  else matrixColors[tr] = 1;
  if (matrixColors[l]) matrixColors[l] += 1;
  else matrixColors[l] = 1;
  if (matrixColors[r]) matrixColors[r] += 1;
  else matrixColors[r] = 1;
  if (matrixColors[bl]) matrixColors[bl] += 1;
  else matrixColors[bl] = 1;
  if (matrixColors[br]) matrixColors[br] += 1;
  else matrixColors[br] = 1;

  let tuple = [];
  let len = 0;

  for (i in matrixColors) {
    len++;
  }

  if (len > 2) {
    let highest = -1;
    let second = -1;

    for (i in matrixColors) {
      const o = matrixColors[i];
      if (o > highest) {
        second = highest;
        highest = Number(i);
      } else if (o > second) {
        second = Number(i);
      }
    }

    tuple = [highest, second];

    tl = calcClosest(tuple, tl) === highest;
    tr = calcClosest(tuple, tr) === highest;
    l = calcClosest(tuple, l) === highest;
    r = calcClosest(tuple, r) === highest;
    bl = calcClosest(tuple, bl) === highest;
    br = calcClosest(tuple, br) === highest;
  } else {
    for (i in matrixColors) {
      tuple.push(Number(i));
    }

    tl = tl === tuple[0];
    tr = tr === tuple[0];
    l = l === tuple[0];
    r = r === tuple[0];
    bl = bl === tuple[0];
    br = br === tuple[0];
  }

  return {
    matrix: [
      [tl, tr],
      [l, r],
      [bl, br],
    ],
    colors: tuple,
  };
}

function getDrawingCharacter(tl, tr, l, r, bl, br) {
  let data = 128;

  if (!br) {
    data += tl ? 1 : 0;
    data += tr ? 2 : 0;
    data += l ? 4 : 0;
    data += r ? 8 : 0;
    data += bl ? 16 : 0;
  } else {
    data += tl ? 0 : 1;
    data += tr ? 0 : 2;
    data += l ? 0 : 4;
    data += r ? 0 : 8;
    data += bl ? 0 : 16;
  }

  return { char: data, inverted: br };
}

const colorIndexChars = "0123456789abcedfghijklmnopqrstuvwxyz";
const colorIndex = colorIndexChars.split("");

function removeAlpha(color) {
  let out = Jimp.intToRGBA(color);
  return rgbToDecimal(out.r, out.g, out.b);
}

exports.toCC = function (image, pallete) {
  console.log(`[toCC] converting ${image} with pallete ${pallete}`);

  const promise = new Promise((resolve, reject) => {
    let outputPallete = {};
    Jimp.read(pallete, (err, palleteImage) => {
      for (let i = 0; i < 16; i++) {
        outputPallete[colorIndex[i]] = removeAlpha(
          palleteImage.getPixelColor(i, 0)
        );
      }

      console.log("[toCC] got pallete");

      Jimp.read(image, (err, main) => {
        const [width, height] = [main.getWidth(), main.getHeight()];
        console.log(width, height);

        let header = Buffer.alloc(0);
        let output = Buffer.alloc(0);

        for (let i in outputPallete) {
          const data = outputPallete[i];
          const temp = Buffer.alloc(8);
          temp.write(zeroPad(data, 8));
          header = Buffer.concat([header, temp]);
        }

        for (let y = 0; y < Math.ceil(height / 3); y++) {
          let charOut = "";
          let bgOut = "";
          let fgOut = "";

          for (let x = 0; x < Math.ceil(width / 2); x++) {
            const { matrix, colors } = generateMatrix(
              parseInt(removeAlpha(main.getPixelColor(x * 2, y * 3))),
              parseInt(removeAlpha(main.getPixelColor(x * 2 + 1, y * 3))),
              parseInt(removeAlpha(main.getPixelColor(x * 2, y * 3 + 1))),
              parseInt(removeAlpha(main.getPixelColor(x * 2 + 1, y * 3 + 1))),
              parseInt(removeAlpha(main.getPixelColor(x * 2, y * 3 + 2))),
              parseInt(removeAlpha(main.getPixelColor(x * 2 + 1, y * 3 + 2)))
            );

            const { char, inverted } = getDrawingCharacter(
              matrix[0][0],
              matrix[0][0],
              matrix[1][0],
              matrix[1][1],
              matrix[2][0],
              matrix[2][1]
            );

            let foreground = "0";
            let background = "0";

            if (colors.length === 1) {
              for (let i in outputPallete) {
                const o = outputPallete[i];
                if (o == colors[0]) {
                  foreground = i;
                  background = i;
                  break;
                }
              }
            } else {
              for (let i in outputPallete) {
                const o = outputPallete[i];
                if (o == colors[0]) {
                  foreground = i;
                } else if (o == colors[1]) {
                  background = i;
                }
              }
            }

            charOut += char === 128 ? " " : String.fromCharCode(char);
            bgOut += inverted ? background : foreground;
            fgOut += inverted ? foreground : background;
          }

          const tempChar = Buffer.from(charOut);
          const tempBg = Buffer.from(bgOut);
          const tempFg = Buffer.from(fgOut);

          output = Buffer.concat([output, tempChar, tempBg, tempFg]);
        }

        console.log("[toCC] generation complete, creating file");

        resolve(Buffer.concat([header, output]));
      });
    });
  });

  return promise;
};

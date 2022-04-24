# cc-video

This is a Node-JS app that converts videos into a playable format for ComputerCraft computers, with video and (incredibly horrible) audio.

## Setup

Import a video file and run these commands:

```
node generate-audio.js <video>
node generate-video.js <video>
```

This will output audio and video to the ./temp folder. The only resources you need from this is the `frames` folder, `palletes` folder, and the `audio.raw` file.
When these files have been generated, move the previously specified files and folders to a folder in a folder named `videos`, e.g. `videos/historyoftheworld`. When you go to play this file later, you will use what you named the folder inside videos. You'll be able to delete the `.temp` folder and the source video now.

### Playback in CC

**Note:** This software is designed for CC:T 1.100.4. If this does not work with your version of CC, please submit and issue and I'll try to get it working. **I will not backport this software to any other version of CC/Computronics/whatever else.**

Once you've generated a video, next you'll need to actually play the video. For prerequisites, you will need a max size monitor, except 2 blocks smaller, and a speaker to play audio. It is reccomended to use two computers, however one should presumebly work, although it may be slower. Download the provided files in the `cc` folder in this repo to your computers. For the video, `render.lua` and `receive-video.lua` are required, and `receive-audio.lua` is required for audio, along with [AUKit](https://github.com/MCJack123/AUKit). You'll also need to set up the monitors in the `receive-video.lua` file, and the websocket URLs in both the `receive-audio.lua` and `receive-video.lua` files.

Now that the software has been installed on the computers, start the stream JS file with `yarn stream`. Note that port 5555 and 5556 must be open and forwarded to send and receive video / audio. To play a video, start the Lua files, open a browser and go to `http://localhost:5555/play/<video>`, where `<video>` is what you named the folder with the video information. The video & audio should start playing, although the audio will sound horrible.

## Help Wanted

If you know how to fix the issues with the audio skipping, please make an issue so I can fix this problem. Thanks!
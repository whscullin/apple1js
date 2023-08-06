import MicroModal from "micromodal";

import Apple1IO from "./apple1io";
import CPU6502 from "./cpu6502";
import Prefs from "./prefs";
import RAM from "./ram";
import { TextPage } from "./canvas1";
import { debug, hup } from "./util";

import Basic from "./roms/basic";
import Bios from "./roms/bios";
import Krusader from "./roms/krusader";

import ACI from "./cards/aci";

import { mapKeyEvent, KeyBoard } from "./ui/keyboard";
import { address, byte } from "./types";

let DEBUG = false;
let TRACE = true;
const skidmarks: string[] = [];

let focused = false;
let startTime = Date.now();
let lastCycles = 0;
let renderedFrames = 0,
  lastFrames = 0;
let paused = false;

let hashtag: string | undefined;
const prefs = new Prefs();
let runTimer: ReturnType<typeof setInterval> | null = null;
const cpu = new CPU6502();

var krusader = window.location.hash == "#krusader";

var raml, ramh, rom, aci: ACI, io: Apple1IO, text: TextPage, keyboard: KeyBoard;

// 32K base memory. Should be 0x0f for 4K, 0x1f for 8K, 0x3f for 16K
raml = new RAM(0x00, 0x7f);
text = new TextPage();
text.init();

aci = new ACI(cpu, {
  progress: function (val) {
    document.querySelector<HTMLElement>("#tape")!.style.width =
      val * 100 + "px";
  },
});
io = new Apple1IO(text);

if (krusader) {
  ramh = null;
  rom = new Krusader();
} else {
  // ramh = new RAM(0xe0, 0xef); // 4K ACI memory.
  ramh = new Basic();
  rom = new Bios();
}
keyboard = new KeyBoard("#keyboard", cpu, io, text);

cpu.addPageHandler(raml);
if (ramh) {
  cpu.addPageHandler(ramh);
}
cpu.addPageHandler(rom);

cpu.addPageHandler(aci);
cpu.addPageHandler(io);

var showFPS = false;

interface Tape {
  script: string;
  tracks: number[][];
}

declare global {
  interface Window {
    tapes: Record<string, Tape>;
  }
}

//aci.setData([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88])
//aci.setData([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07])
//aci.setData([0x01,0x23,0x45,0x67,0x89,0xab,0xcd,0xef])

//aci.setData(tapes['BASIC']);
aci.setData(window.tapes["Microchess"].tracks);

// Audio Buffer Source
declare global {
  interface Window {
    webkitAudioContext: AudioContext;
  }
}

const AudioContext = window.AudioContext || window.webkitAudioContext;
const context = new AudioContext();

export function doLoadLocal(files: FileList) {
  context.resume();
  files =
    files || document.querySelector<HTMLInputElement>("#local_file")!.files;
  if (files.length == 1) {
    var file = files[0];
    var fileReader = new FileReader();
    fileReader.onload = function (ev) {
      context.decodeAudioData(
        ev.target!.result as ArrayBuffer,
        function (buffer) {
          var buf = [];
          var data = buffer.getChannelData(0);
          var old = data[0] > 0.25;
          var last = 0;
          for (var idx = 1; idx < data.length; idx++) {
            var current = data[idx] > 0.25;
            if (current != old) {
              var delta = idx - last;
              buf.push(Math.floor((delta / buffer.sampleRate) * 1023000));
              old = current;
              last = idx;
            }
          }
          aci.buffer = buf;
          MicroModal.close("local-modal");
        },
        function () {
          window.alert("Unable to read tape file: " + file.name);
        }
      );
    };
    fileReader.readAsArrayBuffer(file);
  }
}

function updateKHz() {
  let now = Date.now();
  let ms = now - startTime;
  let cycles = cpu.getCycles();
  let delta: number;

  if (showFPS) {
    delta = renderedFrames - lastFrames;
    var fps = Math.floor(delta / (ms / 1000));
    document.querySelector("#khz")!.innerHTML = fps + "fps";
  } else {
    delta = cycles - lastCycles;
    var khz = Math.floor(delta / ms);
    document.querySelector("#khz")!.innerHTML = khz + "KHz";
  }

  startTime = now;
  lastCycles = cycles;
  lastFrames = renderedFrames;
}

var loading = false;
var throttling = true;
var turbotape = false;

export function toggleFPS() {
  showFPS = !showFPS;
}

export function toggleSpeed() {
  throttling =
    document.querySelector<HTMLInputElement>("#speed_toggle")!.checked;
  if (runTimer) {
    run();
  }
}

export function setKeyBuffer(text: string) {
  io.paste(text);
}

export function setTurboTape(val: boolean) {
  turbotape = val;
}

function run(pc?: address) {
  if (runTimer) {
    clearInterval(runTimer);
  }

  if (pc) {
    cpu.setPC(pc);
  }

  var ival = 30,
    step = 1023 * ival,
    stepMax = step;

  if (!throttling) {
    ival = 1;
  }

  var now,
    last = Date.now();
  var runFn = function () {
    now = Date.now();
    renderedFrames++;
    step = (now - last) * 1023;
    last = now;
    if (step > stepMax) {
      step = stepMax;
    }
    if (document.location.hash != hashtag) {
      hashtag = document.location.hash;
    }
    if (!loading) {
      if (DEBUG) {
        cpu.stepCyclesDebug(TRACE ? 1 : step, function () {
          var line = JSON.stringify(cpu.getState());
          if (TRACE) {
            debug(line);
          } else {
            skidmarks.push(line);
            if (skidmarks.length > 256) {
              skidmarks.shift();
            }
          }
        });
      } else {
        cpu.stepCycles(step);
      }
      text.blit();
    }
    if (!paused) {
      requestAnimationFrame(runFn);
    }
  };
  requestAnimationFrame(runFn);
}

function stop() {
  if (runTimer) {
    clearInterval(runTimer);
  }
  runTimer = null;
}

function reset() {
  cpu.reset();
}

declare global {
  interface Document {
    webkitCancelFullScreen: () => void;
    webkitIsFullScreen: boolean;
  }
  interface Element {
    webkitRequestFullScreen: (options?: unknown) => void;
  }
}

var _key: byte;
function _keydown(evt: KeyboardEvent) {
  if (evt.keyCode === 112) {
    cpu.reset();
  } else if (evt.keyCode === 113) {
    if (document.webkitIsFullScreen) {
      document.webkitCancelFullScreen();
    } else {
      var elem = document.getElementById("display");
      elem!.webkitRequestFullScreen();
    }
  } else if (evt.key === "Shift") {
    keyboard.shiftKey(true);
  } else if (evt.key == "Control") {
    keyboard.controlKey(true);
  } else if (!focused && (!evt.metaKey || evt.ctrlKey)) {
    evt.preventDefault();

    var key = mapKeyEvent(evt);
    if (key != 0xff) {
      if (_key != 0xff) io.keyUp();
      io.keyDown(key);
      _key = key;
    }
  }
}

function _keyup(evt: KeyboardEvent) {
  _key = 0xff;

  if (evt.key === "Shift") {
    keyboard.shiftKey(false);
  } else if (evt.key === "Control") {
    keyboard.controlKey(false);
  } else {
    if (!focused) {
      io.keyUp();
    }
  }
}

let _updateScreenTimer: ReturnType<typeof setInterval> | null = null;

export function updateScreen() {
  const green =
    document.querySelector<HTMLInputElement>("#green_screen")!.checked;
  const scanlines =
    document.querySelector<HTMLInputElement>("#show_scanlines")!.checked;

  text.green(green);
  text.scanlines(scanlines);

  if (!_updateScreenTimer)
    _updateScreenTimer = setInterval(function () {
      text.refresh();
      if (_updateScreenTimer) {
        clearInterval(_updateScreenTimer);
      }
      _updateScreenTimer = null;
    }, 100);
}

paused = false;
export function pauseRun(b: HTMLButtonElement) {
  if (paused) {
    run();
    b.value = "Pause";
  } else {
    stop();
    b.value = "Run";
  }
  paused = !paused;
}

export function openOptions() {
  MicroModal.show("options-modal");
}

export function openLoadText(event?: MouseEvent) {
  if (event && event.altKey) {
    MicroModal.show("local-modal");
  } else {
    MicroModal.show("input-modal");
  }
}

export function doLoadText() {
  var text = document.querySelector<HTMLInputElement>("#text_input")!.value;
  if (!text.indexOf("//Binary")) {
    var lines = text.split("\n");
    lines.forEach(function (line) {
      var parts = line.split(": ");
      if (parts.length == 2) {
        let addr: address = 0;
        if (parts[0].length > 0) {
          addr = parseInt(parts[0], 16);
        }
        var data = parts[1].split(" ");
        for (var idx = 0; idx < data.length; idx++) {
          cpu.write(addr >> 8, addr & 0xff, parseInt(data[idx], 16));
          addr++;
        }
      }
    });
  } else {
    io.paste(text);
  }
  MicroModal.close("input-modal");
}

export function handleDragOver(event: DragEvent) {
  event.preventDefault();
  event.dataTransfer!.dropEffect = "copy";
}

export function handleDrop(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();

  var dt = event.dataTransfer;
  if (dt?.files && dt.files.length > 0) {
    doLoadLocal(dt.files);
  }
}

export function handleDragEnd(event: DragEvent) {
  var dt = event.dataTransfer;
  if (dt?.items) {
    for (var i = 0; i < dt.items.length; i++) {
      dt.items.remove(i);
    }
  } else {
    event.dataTransfer?.clearData();
  }
}

MicroModal.init();

document.addEventListener("DOMContentLoaded", function () {
  hashtag = document.location.hash;

  /*
   * Input Handling
   */

  const canvas = document.querySelector<HTMLCanvasElement>("#text")!;
  const context = canvas.getContext("2d")!;

  text.setContext(context);

  window.addEventListener("keydown", _keydown);
  window.addEventListener("keyup", _keyup);

  window.addEventListener("paste", (event) => {
    var paste = event.clipboardData!.getData("text/plain");
    setKeyBuffer(paste);
    event.preventDefault();
  });

  window.addEventListener("copy", (event) => {
    event.clipboardData?.setData("text/plain", text.getText());
    event.preventDefault();
  });

  document.querySelectorAll("input,textarea").forEach(function (el) {
    el.addEventListener("focus", function () {
      focused = true;
    });
  });
  document.querySelectorAll("input,textarea").forEach(function (el) {
    el.addEventListener("blur", function () {
      focused = false;
    });
  });
  keyboard.create();

  if (prefs.havePrefs()) {
    document
      .querySelectorAll<HTMLInputElement>("input[type=checkbox]")
      .forEach(function (el) {
        var val = prefs.readPref(el.id);
        if (val != null) el.checked = JSON.parse(val);
      });
    document
      .querySelectorAll<HTMLInputElement>("input[type=checkbox]")
      .forEach(function (el) {
        el.addEventListener("change", function () {
          prefs.writePref(el.id, JSON.stringify(el.checked));
        });
      });
  }

  turbotape = document.querySelector<HTMLInputElement>("#turbo_tape")!.checked;

  Object.keys(window.tapes)
    .sort()
    .forEach(function (key) {
      var option = document.createElement("option");
      option.value = key;
      option.text = key;
      document.querySelector("#tape_select")!.append(option);
    });

  function doTapeSelect() {
    var tapeId =
      document.querySelector<HTMLInputElement>("#tape_select")!.value;
    var tape = window.tapes[tapeId];
    if (!tape) {
      document.querySelector<HTMLInputElement>("#text_input")!.value = "";
      return;
    }
    debug("Loading", tapeId);

    window.location.hash = tapeId;
    reset();
    if (turbotape) {
      var trackIdx = 0,
        script = "";
      var parts = tape.script.split("\n");
      // Ignore part 0 (C100R)
      // Split part 1 into ranges
      var ranges = parts[1].split(" ");
      var idx;
      for (idx = 0; idx < ranges.length; idx++) {
        var range = ranges[idx].split(".");
        var start = parseInt(range[0], 16);
        var end = parseInt(range[1], 16);
        var track = tape.tracks[trackIdx];
        var kdx = 0;
        for (var jdx = start; jdx <= end; jdx++) {
          cpu.write(jdx >> 8, jdx & 0xff, track[kdx++]);
        }
        trackIdx++;
      }
      // Execute parts 2-n
      for (idx = 2; idx < parts.length; idx++) {
        if (parts[idx]) {
          script += parts[idx] + "\n";
        }
      }
      document.querySelector<HTMLInputElement>("#text_input")!.value = script;
    } else {
      aci.setData(tape.tracks);
      document.querySelector<HTMLInputElement>("#text_input")!.value =
        tape.script;
    }
    doLoadText();
  }
  document
    .querySelector("#tape_select")!
    .addEventListener("change", doTapeSelect);

  run();
  setInterval(updateKHz, 1000);
  updateScreen();

  var tape = hup();
  if (tape) {
    openLoadText();
    document.querySelector<HTMLInputElement>("#tape_select")!.value = tape;
    doTapeSelect();
  }
});

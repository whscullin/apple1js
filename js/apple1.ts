/* Copyright 2010-2023 Will Scullin <scullin@scullinsteel.com>
 *
 * Permission to use, copy, modify, distribute, and sell this software and its
 * documentation for any purpose is hereby granted without fee, provided that
 * the above copyright notice appear in all copies and that both that
 * copyright notice and this permission notice appear in supporting
 * documentation.  No representations are made about the suitability of this
 * software for any purpose.  It is provided 'as is' without express or
 * implied warranty.
 */

import MicroModal from 'micromodal';

import Apple1IO from './apple1io';
import {CPU6502, word, byte} from '@whscullin/cpu6502';
import Prefs from './prefs';
import RAM from './ram';
import {TextPage} from './canvas1';
import {debug, hup} from './util';

import Basic from './roms/basic';
import Bios from './roms/bios';
import Krusader from './roms/krusader';

import ACI from './cards/aci';

import {mapKeyEvent, KeyBoard} from './ui/keyboard';

// eslint-disable-next-line prefer-const
let DEBUG = false;
// eslint-disable-next-line prefer-const
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

const krusader = window.location.hash === '#krusader';

let ramh, rom;

// 32K base memory. Should be 0x0f for 4K, 0x1f for 8K, 0x3f for 16K
const raml = new RAM(0x00, 0x7f);
const text = new TextPage();
text.init();

const aci = new ACI(cpu, {
  progress: function (val) {
    document.querySelector<HTMLElement>('#tape')!.style.width =
      val * 100 + 'px';
  },
});
const io = new Apple1IO(text);

if (krusader) {
  ramh = null;
  rom = new Krusader();
} else {
  // ramh = new RAM(0xe0, 0xef); // 4K ACI memory.
  ramh = new Basic();
  rom = new Bios();
}
const keyboard = new KeyBoard('#keyboard', cpu, io, text);

cpu.addPageHandler(raml);
if (ramh) {
  cpu.addPageHandler(ramh);
}
cpu.addPageHandler(rom);

cpu.addPageHandler(aci);
cpu.addPageHandler(io);

let showFPS = false;

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
aci.setData(window.tapes['Microchess'].tracks);

// Audio Buffer Source
declare global {
  interface Window {
    webkitAudioContext: AudioContext;
  }
}

const AudioContext = window.AudioContext || window.webkitAudioContext;
const context = new AudioContext();

export function doLoadLocal(files: FileList) {
  context
    .resume()
    .then(() => {
      files =
        files || document.querySelector<HTMLInputElement>('#local_file')!.files;
      if (files.length === 1) {
        const file = files[0];
        const fileReader = new FileReader();
        fileReader.onload = function (ev) {
          context
            .decodeAudioData(
              ev.target!.result as ArrayBuffer,
              function (buffer) {
                const buf = [];
                const data = buffer.getChannelData(0);
                let old = data[0] > 0.25;
                let last = 0;
                for (let idx = 1; idx < data.length; idx++) {
                  const current = data[idx] > 0.25;
                  if (current !== old) {
                    const delta = idx - last;
                    buf.push(Math.floor((delta / buffer.sampleRate) * 1023000));
                    old = current;
                    last = idx;
                  }
                }
                aci.buffer = buf;
                MicroModal.close('local-modal');
              },
              function () {
                window.alert('Unable to read tape file: ' + file.name);
              },
            )
            .catch(console.error);
        };
        fileReader.readAsArrayBuffer(file);
      }
    })
    .catch(console.error);
}

function updateKHz() {
  const now = Date.now();
  const ms = now - startTime;
  const cycles = cpu.getCycles();
  let delta: number;

  if (showFPS) {
    delta = renderedFrames - lastFrames;
    const fps = Math.floor(delta / (ms / 1000));
    document.querySelector('#khz')!.innerHTML = fps + 'fps';
  } else {
    delta = cycles - lastCycles;
    const khz = Math.floor(delta / ms);
    document.querySelector('#khz')!.innerHTML = khz + 'KHz';
  }

  startTime = now;
  lastCycles = cycles;
  lastFrames = renderedFrames;
}

let throttling = true;
let turbotape = false;

export function toggleFPS() {
  showFPS = !showFPS;
}

export function toggleSpeed() {
  throttling =
    document.querySelector<HTMLInputElement>('#speed_toggle')!.checked;
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

function run(pc?: word) {
  if (runTimer) {
    clearInterval(runTimer);
  }

  if (pc) {
    cpu.setPC(pc);
  }

  let ival = 30;
  let step = 1023 * ival;
  const stepMax = step;

  if (!throttling) {
    ival = 1;
  }

  let now;
  let last = Date.now();
  const runFn = function () {
    now = Date.now();
    renderedFrames++;
    step = (now - last) * 1023;
    last = now;
    if (step > stepMax) {
      step = stepMax;
    }
    if (document.location.hash !== hashtag) {
      hashtag = document.location.hash;
    }
    if (DEBUG) {
      cpu.stepCyclesDebug(TRACE ? 1 : step, function () {
        const line = JSON.stringify(cpu.getState());
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

let _key: byte;
function _keydown(evt: KeyboardEvent) {
  const F1 = 112,
    F2 = 113;
  if (evt.keyCode === F1) {
    cpu.reset();
  } else if (evt.keyCode === F2) {
    if (document.webkitIsFullScreen) {
      document.webkitCancelFullScreen();
    } else {
      const elem = document.getElementById('display');
      elem!.webkitRequestFullScreen();
    }
  } else if (evt.key === 'Shift') {
    keyboard.shiftKey(true);
  } else if (evt.key === 'Control') {
    keyboard.controlKey(true);
  } else if (!focused && (!evt.metaKey || evt.ctrlKey)) {
    evt.preventDefault();

    const key = mapKeyEvent(evt);
    if (key !== 0xff) {
      if (_key !== 0xff) io.keyUp();
      io.keyDown(key);
      _key = key;
    }
  }
}

function _keyup(evt: KeyboardEvent) {
  _key = 0xff;

  if (evt.key === 'Shift') {
    keyboard.shiftKey(false);
  } else if (evt.key === 'Control') {
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
    document.querySelector<HTMLInputElement>('#green_screen')!.checked;
  const scanlines =
    document.querySelector<HTMLInputElement>('#show_scanlines')!.checked;

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
    b.value = 'Pause';
  } else {
    stop();
    b.value = 'Run';
  }
  paused = !paused;
}

export function openOptions() {
  MicroModal.show('options-modal');
}

export function openLoadText(event?: MouseEvent) {
  if (event && event.altKey) {
    MicroModal.show('local-modal');
  } else {
    MicroModal.show('input-modal');
  }
}

export function doLoadText() {
  const text = document.querySelector<HTMLInputElement>('#text_input')!.value;
  if (!text.indexOf('//Binary')) {
    const lines = text.split('\n');
    lines.forEach(function (line) {
      const parts = line.split(': ');
      if (parts.length === 2) {
        let addr: word = 0;
        if (parts[0].length > 0) {
          addr = parseInt(parts[0], 16);
        }
        const data = parts[1].split(' ');
        for (let idx = 0; idx < data.length; idx++) {
          cpu.write(addr >> 8, addr & 0xff, parseInt(data[idx], 16));
          addr++;
        }
      }
    });
  } else {
    io.paste(text);
  }
  MicroModal.close('input-modal');
}

export function handleDragOver(event: DragEvent) {
  event.preventDefault();
  event.dataTransfer!.dropEffect = 'copy';
}

export function handleDrop(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();

  const dt = event.dataTransfer;
  if (dt?.files && dt.files.length > 0) {
    doLoadLocal(dt.files);
  }
}

export function handleDragEnd(event: DragEvent) {
  const dt = event.dataTransfer;
  if (dt?.items) {
    for (let i = 0; i < dt.items.length; i++) {
      dt.items.remove(i);
    }
  } else {
    event.dataTransfer?.clearData();
  }
}

MicroModal.init();

document.addEventListener('DOMContentLoaded', function () {
  hashtag = document.location.hash;

  /*
   * Input Handling
   */

  const canvas = document.querySelector<HTMLCanvasElement>('#text')!;
  const context = canvas.getContext('2d')!;

  text.setContext(context);

  window.addEventListener('keydown', _keydown);
  window.addEventListener('keyup', _keyup);

  window.addEventListener('paste', (event) => {
    const paste = event.clipboardData!.getData('text/plain');
    setKeyBuffer(paste);
    event.preventDefault();
  });

  window.addEventListener('copy', (event) => {
    event.clipboardData?.setData('text/plain', text.getText());
    event.preventDefault();
  });

  document.querySelectorAll('input,textarea').forEach(function (el) {
    el.addEventListener('focus', function () {
      focused = true;
    });
  });
  document.querySelectorAll('input,textarea').forEach(function (el) {
    el.addEventListener('blur', function () {
      focused = false;
    });
  });
  keyboard.create();

  if (prefs.havePrefs()) {
    document
      .querySelectorAll<HTMLInputElement>('input[type=checkbox]')
      .forEach(function (el) {
        const val = prefs.readPref(el.id);
        if (val != null) el.checked = !!JSON.parse(val);
      });
    document
      .querySelectorAll<HTMLInputElement>('input[type=checkbox]')
      .forEach(function (el) {
        el.addEventListener('change', function () {
          prefs.writePref(el.id, JSON.stringify(el.checked));
        });
      });
  }

  turbotape = document.querySelector<HTMLInputElement>('#turbo_tape')!.checked;

  Object.keys(window.tapes)
    .sort()
    .forEach(function (key) {
      const option = document.createElement('option');
      option.value = key;
      option.text = key;
      document.querySelector('#tape_select')!.append(option);
    });

  function doTapeSelect() {
    const tapeId =
      document.querySelector<HTMLInputElement>('#tape_select')!.value;
    const tape = window.tapes[tapeId];
    if (!tape) {
      document.querySelector<HTMLInputElement>('#text_input')!.value = '';
      return;
    }
    debug('Loading', tapeId);

    window.location.hash = tapeId;
    reset();
    if (turbotape) {
      let trackIdx = 0,
        script = '';
      const parts = tape.script.split('\n');
      // Ignore part 0 (C100R)
      // Split part 1 into ranges
      const ranges = parts[1].split(' ');
      let idx;
      for (idx = 0; idx < ranges.length; idx++) {
        const range = ranges[idx].split('.');
        const start = parseInt(range[0], 16);
        const end = parseInt(range[1], 16);
        const track = tape.tracks[trackIdx];
        let kdx = 0;
        for (let jdx = start; jdx <= end; jdx++) {
          cpu.write(jdx >> 8, jdx & 0xff, track[kdx++]);
        }
        trackIdx++;
      }
      // Execute parts 2-n
      for (idx = 2; idx < parts.length; idx++) {
        if (parts[idx]) {
          script += parts[idx] + '\n';
        }
      }
      document.querySelector<HTMLInputElement>('#text_input')!.value = script;
    } else {
      aci.setData(tape.tracks);
      document.querySelector<HTMLInputElement>('#text_input')!.value =
        tape.script;
    }
    doLoadText();
  }
  document
    .querySelector('#tape_select')!
    .addEventListener('change', doTapeSelect);

  run();
  setInterval(updateKHz, 1000);
  updateScreen();

  const tape = hup();
  if (tape) {
    openLoadText();
    document.querySelector<HTMLInputElement>('#tape_select')!.value = tape;
    doTapeSelect();
  }
});

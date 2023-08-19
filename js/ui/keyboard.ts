/* Copyright 2010-2019 Will Scullin <scullin@scullinstekb.com>
 *
 * Permission to use, copy, modify, distribute, and sell this software and its
 * documentation for any purpose is hereby granted without fee, provided that
 * the above copyright notice appear in all copies and that both that
 * copyright notice and this permission notice appear in supporting
 * documentation.  No representations are made about the suitability of this
 * software for any purpose.  It is provided "as is" without express or
 * implied warranty.
 */

import CPU6502 from 'js/cpu6502';
import { debug, toHex } from '../util';
import Apple1IO from 'js/apple1io';
import { TextPage } from 'js/canvas1';
import { byte } from 'js/types';

// keycode: [plain, cntl, shift]

const keymap: Record<byte, readonly byte[]> = {
  // Most of these won't happen
  0x00: [0x00, 0x00, 0x00], //
  0x01: [0x01, 0x01, 0x01], //
  0x02: [0x02, 0x02, 0x02], //
  0x03: [0x03, 0x03, 0x03], //
  0x04: [0x04, 0x04, 0x04], //
  0x05: [0x05, 0x05, 0x05], //
  0x06: [0x06, 0x06, 0x06], //
  0x07: [0x07, 0x07, 0x07], //
  0x08: [0x5f, 0x5f, 0x5f], // BS
  0x09: [0x09, 0x09, 0x09], // TAB
  0x0a: [0x0a, 0x0a, 0x0a], //
  0x0b: [0x0b, 0x0b, 0x0b], //
  0x0c: [0x0c, 0x0c, 0x0c], //
  0x0d: [0x0d, 0x0d, 0x0d], // CR
  0x0e: [0x0e, 0x0e, 0x0e], //
  0x0f: [0x0f, 0x0f, 0x0f], //

  0x10: [0xff, 0xff, 0xff], // SHIFT
  0x11: [0xff, 0xff, 0xff], // CTRL
  0x12: [0xff, 0xff, 0xff], // OPTION
  0x13: [0x13, 0x13, 0x13], //
  0x14: [0x14, 0x14, 0x14], //
  0x15: [0x15, 0x15, 0x15], //
  0x16: [0x16, 0x16, 0x16], //
  0x17: [0x17, 0x17, 0x18], //
  0x18: [0x18, 0x18, 0x18], //
  0x19: [0x19, 0x19, 0x19], //
  0x1a: [0x1a, 0x1a, 0x1a], //
  0x1b: [0x1b, 0x1b, 0x1b], // ESC
  0x1c: [0x1c, 0x1c, 0x1c], //
  0x1d: [0x1d, 0x1d, 0x1d], //
  0x1e: [0x1e, 0x1e, 0x1e], //
  0x1f: [0x1f, 0x1f, 0x1f], //

  // Most of these besides space won't happen
  0x20: [0x20, 0x20, 0x20], //
  0x21: [0x21, 0x21, 0x21], //
  0x22: [0x22, 0x22, 0x22], //
  0x23: [0x23, 0x23, 0x23], //
  0x24: [0x24, 0x24, 0x24], //
  0x25: [0x5f, 0x5f, 0x5f], // <- left
  0x26: [0x0b, 0x0b, 0x0b], // ^ up
  0x27: [0x15, 0x15, 0x15], // -> right
  0x28: [0x0a, 0x0a, 0x0a], // v down
  0x29: [0x29, 0x29, 0x29], // )
  0x2a: [0x2a, 0x2a, 0x2a], // *
  0x2b: [0x2b, 0x2b, 0x2b], // +
  0x2c: [0x2c, 0x2c, 0x3c], // , - <
  0x2d: [0x2d, 0x2d, 0x5f], // - - _
  0x2e: [0x2e, 0x2e, 0x3e], // . - >
  0x2f: [0x2f, 0x2f, 0x3f], // / - ?

  0x30: [0x30, 0x30, 0x29], // 0 - )
  0x31: [0x31, 0x31, 0x21], // 1 - !
  0x32: [0x32, 0x00, 0x40], // 2 - @
  0x33: [0x33, 0x33, 0x23], // 3 - #
  0x34: [0x34, 0x34, 0x24], // 4 - $
  0x35: [0x35, 0x35, 0x25], // 5 - %
  0x36: [0x36, 0x36, 0x5e], // 6 - ^
  0x37: [0x37, 0x37, 0x26], // 7 - &
  0x38: [0x38, 0x38, 0x2a], // 8 - *
  0x39: [0x39, 0x39, 0x28], // 9 - (
  0x3a: [0x3a, 0x3a, 0x3a], // :
  0x3b: [0x3b, 0x3b, 0x3a], // ; - :
  0x3c: [0x3c, 0x3c, 0x3c], // <
  0x3d: [0x3d, 0x3d, 0x2b], // = - +
  0x3e: [0x3e, 0x3e, 0x3e], // >
  0x3f: [0x3f, 0x3f, 0x3f], // ?

  // Alpha and control
  0x40: [0x40, 0x00, 0x40], // @
  0x41: [0x41, 0x01, 0x41], // A
  0x42: [0x42, 0x02, 0x42], // B
  0x43: [0x43, 0x03, 0x43], // C - BRK
  0x44: [0x44, 0x04, 0x44], // D
  0x45: [0x45, 0x05, 0x45], // E
  0x46: [0x46, 0x06, 0x46], // F
  0x47: [0x47, 0x07, 0x47], // G - BELL
  0x48: [0x48, 0x08, 0x48], // H
  0x49: [0x49, 0x09, 0x49], // I - TAB
  0x4a: [0x4a, 0x0a, 0x4a], // J - NL
  0x4b: [0x4b, 0x0b, 0x4b], // K - VT
  0x4c: [0x4c, 0x0c, 0x4c], // L
  0x4d: [0x4d, 0x0d, 0x4d], // M - CR
  0x4e: [0x4e, 0x0e, 0x4e], // N
  0x4f: [0x4f, 0x0f, 0x4f], // O

  0x50: [0x50, 0x10, 0x50], // P
  0x51: [0x51, 0x11, 0x51], // Q
  0x52: [0x52, 0x12, 0x52], // R
  0x53: [0x53, 0x13, 0x53], // S
  0x54: [0x54, 0x14, 0x54], // T
  0x55: [0x55, 0x15, 0x55], // U
  0x56: [0x56, 0x16, 0x56], // V
  0x57: [0x57, 0x17, 0x57], // W
  0x58: [0x58, 0x18, 0x58], // X
  0x59: [0x59, 0x19, 0x59], // Y
  0x5a: [0x5a, 0x1a, 0x5a], // Z
  //    0x5B: [0x5B, 0x1B, 0x5B], // [ - ESC
  //    0x5C: [0x5C, 0x1C, 0x5C], // \
  //    0x5D: [0x5D, 0x1D, 0x5D], // ]
  0x5e: [0x5e, 0x1e, 0x5e], // ^
  0x5f: [0x5f, 0x1f, 0x5f], // _

  // Stray keys
  0xba: [0x3b, 0x3b, 0x3a], // ; - :
  0xbb: [0x3d, 0x3d, 0x2b], // = - +
  0xbc: [0x2c, 0x2c, 0x3c], // , - <
  0xbd: [0x2d, 0x2d, 0x5f], // - - _
  0xbe: [0x2e, 0x2e, 0x3e], // . - >
  0xbf: [0x2f, 0x2f, 0x3f], // / - ?
  0xdb: [0x5b, 0x5b, 0x5b], // [
  0xdc: [0x5c, 0x5c, 0x5c], // \
  0xdd: [0x5d, 0x5d, 0x5d], // ]
  0xde: [0x27, 0x27, 0x22], // ' - "

  0xff: [0xff, 0xff, 0xff], // No comma line
} as const;

const keys = [
  [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ':', '-', 'RESET'],
    ['ESC', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'FEED', 'RETURN'],
    ['CTRL', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', 'OUT', 'CLS'],
    ['SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'SHIFT'],
    ['&nbsp;'],
  ],
  [
    ['!', '"', '#', '$', '%', '&', "'", '(', ')', '0', '*', '=', 'RESET'],
    ['ESC', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', '@', 'LINE', 'RETURN'],
    ['CTRL', 'A', 'S', 'D', 'F', 'BELL', 'H', 'J', 'K', 'L', '+', 'RUB', 'CLS'],
    ['SHIFT', 'Z', 'X', 'C', 'V', 'B', '^', 'M', '<', '>', '?', 'SHIFT'],
    ['&nbsp;'],
  ],
] as const;

export function mapKeyEvent(evt: KeyboardEvent) {
  const code = evt.keyCode;

  if (code in keymap) {
    return keymap[code][evt.shiftKey ? 2 : evt.ctrlKey ? 1 : 0];
  }

  debug('Unhandled key = ' + toHex(code));
  return 0xff;
}

export class KeyBoard {
  shifted = false;
  controlled = false;
  kb: HTMLDivElement;

  constructor(
    id: string,
    private cpu: CPU6502,
    private io: Apple1IO,
    private text: TextPage,
  ) {
    this.kb = document.querySelector<HTMLDivElement>(id)!;
  }

  shiftKey(down: boolean) {
    this.shifted = down;
    this.kb.querySelectorAll('.key-SHIFT').forEach(function (el) {
      if (down) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  controlKey(down: boolean) {
    this.controlled = down;
    this.kb.querySelectorAll('.key-CTRL').forEach(function (el) {
      if (down) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  create() {
    let x, y, row, key, key1, key2, label, label1, label2;

    function buildLabel(k: string) {
      const span = document.createElement('span');
      span.innerHTML = k;
      if (k.length > 1 && !k.startsWith('&')) {
        span.classList.add('small');
      }
      return span;
    }

    const _mouseup = (event: Event) => {
      if (!(event.currentTarget instanceof HTMLElement)) {
        return;
      }
      event.currentTarget.classList.remove('pressed');
    };

    const _mousedown = (event: Event) => {
      if (!(event.currentTarget instanceof HTMLElement)) {
        return;
      }
      event.currentTarget.classList.add('pressed');
      let key = event.currentTarget.dataset[this.shifted ? 'key2' : 'key1'];
      if (!key) {
        return;
      }
      switch (key) {
        case 'BELL':
          key = 'G';
          break;
        case 'RETURN':
          key = '\r';
          break;
        case 'LINE':
        case 'FEED':
          key = '\n';
          break;
        case 'RUB':
        case 'OUT':
          key = '_'; // 0x5f
          break;
        case '&nbsp;':
          key = ' ';
          break;
        case 'ESC':
          key = '\0x1b';
          break;
        default:
          break;
      }

      if (key.length > 1) {
        switch (key) {
          case 'SHIFT':
            this.shifted = !this.shifted;
            this.kb
              .querySelectorAll<HTMLElement>('.key-SHIFT')
              .forEach(function (el: HTMLElement) {
                el.classList.toggle('active');
              });
            break;
          case 'CTRL':
            this.controlled = !this.controlled;
            this.kb.querySelectorAll('.key-CTRL').forEach(function (el) {
              el.classList.toggle('active');
            });
            break;
          case 'RESET':
            this.cpu.reset();
            break;
          case 'CLS':
            this.text.clear();
            break;
          default:
            break;
        }
      } else {
        if (this.controlled && key >= '@' && key <= '_') {
          this.io.keyDown(key.charCodeAt(0) - 0x40);
        } else {
          this.io.keyDown(key.charCodeAt(0));
        }
      }
    };

    for (y = 0; y < 5; y++) {
      row = document.createElement('div');
      row.classList.add('row', 'row' + y);
      this.kb.append(row);
      for (x = 0; x < keys[0][y].length; x++) {
        key1 = keys[0][y][x];
        key2 = keys[1][y][x];

        label = document.createElement('div');
        label1 = buildLabel(key1);
        label2 = buildLabel(key2);

        key = document.createElement('div');
        key.classList.add('key', 'key-' + key1.replace(/[&;]/g, ''));

        if (key1.length > 1) {
          if (key1 !== key2) {
            key.classList.add('vcenter2');
          } else {
            key.classList.add('vcenter');
          }
        }

        if (key1 !== key2) {
          key.classList.add('key-' + key2.replace(/[&;]/g, ''));
          label.append(label2);
          label.append(document.createElement('br'));
        }
        label.append(label1);
        key.append(label);
        key.dataset['key1'] = key1;
        key.dataset['key2'] = key2;

        if (window.ontouchstart === undefined) {
          key.addEventListener('mousedown', _mousedown);
          key.addEventListener('mouseup', _mouseup);
          key.addEventListener('mouseout', _mouseup);
        } else {
          key.addEventListener('touchstart', _mousedown);
          key.addEventListener('touchend', _mouseup);
          key.addEventListener('touchleave', _mouseup);
        }

        row.append(key);
      }
    }
  }
}

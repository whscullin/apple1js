/* Copyright 2010-2023 Will Scullin <scullin@scullinsteel.com>
 *
 * Permission to use, copy, modify, distribute, and sell this software and its
 * documentation for any purpose is hereby granted without fee, provided that
 * the above copyright notice appear in all copies and that both that
 * copyright notice and this permission notice appear in supporting
 * documentation.  No representations are made about the suitability of this
 * software for any purpose.  It is provided "as is" without express or
 * implied warranty.
 */

import { TextPage } from './canvas1';
import type { byte } from './types';

const LOC = {
  KBD: 0x10,
  KBDRDY: 0x011,
  DSP: 0x12,
  DSPCTL: 0x13,
} as const;

export default class Apple1IO {
  _key = 0;
  _keyReady = false;

  _displayReady = false;
  _nextDSP = 0;
  _buffer: string[] = [];

  constructor(private text: TextPage) {}

  start() {
    return 0xd0;
  }
  end() {
    return 0xd0;
  }
  read(_page: byte, off: byte): byte {
    let result = 0;
    off &= 0x13;
    switch (off) {
      case LOC.KBD:
        {
          // Keyboard
          const key = this._buffer.shift();
          if (key != null) {
            result = key.toUpperCase().charCodeAt(0) & 0x7f;
            this._keyReady = this._buffer.length > 0;
          } else {
            result = this._key;
            this._keyReady = false;
          }
          result |= 0x80;
        }
        break;
      case LOC.KBDRDY:
        result = this._keyReady ? 0x80 : 0x00;
        break;
      case LOC.DSP:
        // Display
        // result = (Math.random() > 0.5) ? 0x80 : 0x00;
        result = Date.now() > this._nextDSP ? 0x00 : 0x80;
        break;
      case LOC.DSPCTL:
        break;
    }
    return result;
  }
  write(_page: byte, off: byte, val: byte): void {
    off &= 0x13;
    switch (off) {
      case LOC.KBD:
        break;
      case LOC.KBDRDY:
        break;
      case LOC.DSP:
        // Display
        if (this._displayReady) {
          this.text.write(val);
        }
        this._nextDSP = Date.now() + (this._buffer.length > 0 ? 0 : 17);
        break;
      case LOC.DSPCTL:
        // Don't pretend we care what the value was...
        this._displayReady = true;
        break;
    }
  }
  reset() {
    this.text.clear();
    this._buffer = [];
    this._keyReady = false;
    this._displayReady = false;
  }
  keyUp() {}
  keyDown(key: byte) {
    this._key = key;
    this._keyReady = true;
  }
  paste(buffer: string) {
    buffer = buffer.replace(/\/\/.*\n/g, '');
    buffer = buffer.replace(/\n/g, '\r');
    this._buffer = buffer.split('');
    this._keyReady = true;
  }
}

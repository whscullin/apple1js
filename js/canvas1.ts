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

import { charset } from './roms/apple1char';
import type { byte } from './types';

/*
0: A9 9 AA 20 EF FF E8 8A 4C 2 0
0R
*/

/*
 * Text Page Drawing
 */

export class TextPage {
  _page: ImageData | undefined;
  _context: CanvasRenderingContext2D | undefined;

  _buffer: byte[][] = [];
  _greenMode = false;
  _scanlines = false;

  _black = [0x00, 0x00, 0x00];
  _white = [0xee, 0xff, 0xff];
  _green = [0x00, 0xff, 0x80];
  _blinking = 0;

  _row = 0;
  _col = 0;
  _dirty = false;

  constructor() {
    this._buffer = [];
    for (let row = 0; row < 24; row++) {
      this._buffer[row] = [];
      for (let col = 0; col < 40; col++) {
        this._buffer[row][col] = col % 2 ? 0x00 : 0xff;
      }
    }
    this._dirty = true;
  }

  init() {
    window.setInterval(() => {
      this._blinking = (this._blinking + 1) % 3;
      this._blink();
      this._dirty = true;
    }, 333);
  }

  write(val: byte): void {
    let col;
    val &= 0x7f;

    if (this.transcript) {
      if (val === 0xd) {
        this.transcript += '\n';
      } else if (val >= 0x20) {
        if (val >= 0x60) {
          val &= 0x5f;
        }
        this.transcript += String.fromCharCode(val);
      }
    }

    if (val === 0x0d) {
      for (col = this._col; col < 40; col++) {
        this._buffer[this._row][col] = 0x20;
      }
      this._col = 0;
      this._row++;
    } else {
      this._buffer[this._row][this._col] = val;
      this._col++;
      if (this._col > 39) {
        this._col = 0;
        this._row++;
      }
    }
    if (this._row > 23) {
      this._row = 23;
      this._buffer.shift();
      this._buffer.push([]);
      for (col = 0; col < 40; col++) {
        this._buffer[this._row][col] = 0x20;
      }
    }
    this._buffer[this._row][this._col] = 0x00;
    this.refresh();
  }
  writeAt(row: byte, col: byte, val: byte): void {
    if (!this._page) {
      return;
    }
    this._buffer[row][col] = val;
    const data = this._page.data;
    let color;
    let off = (col * 14 + row * 560 * 8 * 2) * 4;

    let fore = this._greenMode ? this._green : this._white;
    const back = this._black;
    let char = 0;

    if (!val) {
      if (this._blinking) {
        fore = this._black;
      }
    } else {
      char = val & 0x1f;
      char |= val & 0x40 ? 0 : 0x20;
    }

    for (let jdx = 0; jdx < 8; jdx++) {
      let b = charset[char * 8 + jdx];
      for (let idx = 0; idx < 7; idx += 1) {
        b <<= 1;
        color = b & 0x80 ? fore : back;
        const c0 = color[0],
          c1 = color[1],
          c2 = color[2];
        data[off + 0] = data[off + 4] = c0;
        data[off + 1] = data[off + 5] = c1;
        data[off + 2] = data[off + 6] = c2;
        if (!this._scanlines) {
          data[off + 560 * 4] = data[off + 560 * 4 + 4] = c0;
          data[off + 560 * 4 + 1] = data[off + 560 * 4 + 5] = c1;
          data[off + 560 * 4 + 2] = data[off + 560 * 4 + 6] = c2;
        } else {
          data[off + 560 * 4] = data[off + 560 * 4 + 4] = c0 >> 1;
          data[off + 560 * 4 + 1] = data[off + 560 * 4 + 5] = c1 >> 1;
          data[off + 560 * 4 + 2] = data[off + 560 * 4 + 6] = c2 >> 1;
        }
        off += 8;
      }
      off += 546 * 4 + 560 * 4;
    }
  }
  _blink() {
    for (let row = 0; row < 24; row++) {
      for (let col = 0; col < 40; col++) {
        const val = this._buffer[row][col];
        if (!val) {
          this.writeAt(row, col, val);
        }
      }
    }
    this._dirty = true;
  }
  refresh() {
    for (let row = 0; row < 24; row++) {
      for (let col = 0; col < 40; col++) {
        this.writeAt(row, col, this._buffer[row][col]);
      }
    }
    this._dirty = true;
  }
  green(on: boolean) {
    this._greenMode = on;
    this.refresh();
  }
  scanlines(on: boolean) {
    this._scanlines = on;
    this.refresh();
  }
  blit() {
    if (!this._page || !this._context) {
      return;
    }
    if (this._dirty) {
      this._context.putImageData(
        this._page,
        0,
        0,
        0,
        0,
        7 * 40 * 2,
        8 * 24 * 2,
      );
    }
  }
  setContext(context: CanvasRenderingContext2D) {
    this._context = context;
    this._page = context.createImageData(560, 384);
    for (let idx = 0; idx < 560 * 384 * 4; idx++) {
      this._page.data[idx] = 0xff;
    }
  }
  getText() {
    function mapCharCode(charCode: byte) {
      charCode &= 0x7f;
      if (charCode < 0x20) {
        charCode += 0x40;
      }
      if (charCode >= 0x60) {
        charCode -= 0x40;
      }
      return charCode;
    }

    let buffer = '',
      line,
      charCode;
    let row, col;
    for (row = 0; row < 24; row++) {
      line = '';
      for (col = 0; col < 40; col++) {
        charCode = mapCharCode(this._buffer[row][col]);
        line += String.fromCharCode(charCode);
      }
      line = line.trimRight();
      buffer += line + '\n';
    }
    return buffer;
  }
  clear() {
    for (let row = 0; row < 24; row++) {
      for (let col = 0; col < 40; col++) {
        this._buffer[row][col] = 0x20;
      }
    }
    this._col = 0;
    this._row = 0;
    this.refresh();
  }

  transcript = '';
}

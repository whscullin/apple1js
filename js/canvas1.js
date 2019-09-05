/* Copyright 2010-2019Will Scullin <scullin@scullinsteel.com>
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

/*
0: A9 9 AA 20 EF FF E8 8A 4C 2 0
0R
*/

/*
 * Text Page Drawing
 */

export function TextPage()
{
    var _page;
    var _context;

    var _buffer = [];
    var _greenMode = false;
    var _scanlines = false;

    var _black = [0x00,0x00,0x00];
    var _white = [0xee,0xff,0xff];
    var _green = [0x00,0xff,0x80];
    var _blinking = 0;

    var _row = 0;
    var _col = 0;
    var _dirty = false;

    function _init() {
        _buffer = [];
        for (var row = 0; row < 24; row++) {
            _buffer[row] = [];
            for (var col = 0; col < 40; col++) {
                _buffer[row][col] = 0x00;
            }
        }
        _dirty = true;
    }

    _init();

    return {
        init: function() {
            var self = this;
            window.setInterval(function() {
                _blinking = (_blinking + 1) % 3;
                self._blink();
                _dirty = true;
            }, 333);
        },

        write: function(val) {
            var col;
            val &= 0x7f;

            if (this.transcript) {
                if (val == 0xd) {
                    this.transcript += '\n';
                } else if (val >= 0x20) {
                    if (val >= 0x60) {
                        val &= 0x5f;
                    }
                    this.transcript += String.fromCharCode(val);
                }
            }

            if (val == 0x0d) {
                for (col = _col; col < 40; col++) {
                    _buffer[_row][col] = 0x20;
                }
                _col = 0;
                _row++;
            } else {
                if (val >= 0x20) {
                    if (val >= 0x60) {
                        val &= 0x5f;
                    }
                    _buffer[_row][_col] = val;
                    _col++;
                    if (_col > 39) {
                        _col = 0;
                        _row++;
                    }
                }
            }
            if (_row > 23) {
                _row = 23;
                _buffer.shift();
                _buffer.push([]);
                for (col = 0; col < 40; col++) {
                    _buffer[_row][col] = 0x20;
                }
            }
            _buffer[_row][_col] = 0x00;
            this.refresh();
        },
        writeAt: function(row, col, val) {
            _buffer[row][col] = val;
            var data = _page.data, fore, back, color;
            var off = (col * 14 + row * 560 * 8 * 2) * 4;

            fore = _greenMode ? _green : _white;
            back = _black;
            if (!val && !_blinking) {
                fore = _black;
            }
            for (var jdx = 0; jdx < 8; jdx++) {
                var b = charset[(val & 0x3f) * 8 + jdx];
                for (var idx = 0; idx < 7; idx += 1) {
                    b <<= 1;
                    color = (b & 0x80) ? fore : back;
                    var c0 = color[0], c1 = color[1], c2 = color[2];
                    data[off + 0] = data[off + 4] = c0;
                    data[off + 1] = data[off + 5] = c1;
                    data[off + 2] = data[off + 6] = c2;
                    if (!_scanlines) {
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
        },
        _blink: function() {
            for (var row = 0; row < 24; row++) {
                for (var col = 0; col < 40; col++) {
                    var val = _buffer[row][col];
                    if (!val) {
                        this.writeAt(row, col, val);
                    }
                }
            }
            _dirty = true;
        },
        refresh: function() {
            for (var row = 0; row < 24; row++) {
                for (var col = 0; col < 40; col++) {
                    this.writeAt(row, col, _buffer[row][col]);
                }
            }
            _dirty = true;
        },
        green: function(on) {
            _greenMode = on;
            this.refresh();
        },
        scanlines: function(on) {
            _scanlines = on;
            this.refresh();
        },
        blit: function() {
            if (_dirty) {
                _context.putImageData(_page, 0, 0, 0, 0, 7 * 40 * 2, 8 * 24 * 2);
            }
        },
        setContext: function(context) {
            _context = context;
            _page = context.createImageData(560, 384);
            for (var idx = 0; idx < 560 * 384 * 4; idx++) {
                _page.data[idx] = 0xff;
            }
        },
        clear: function canvas_clearScreen() {
            for (var row = 0; row < 24; row++) {
                for (var col = 0; col < 40; col++) {
                    _buffer[row][col] = 0x20;
                }
            }
            _col = 0;
            _row = 0;
            this.refresh();
        },
        transcript: ''
    };
}

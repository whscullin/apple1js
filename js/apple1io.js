/* Copyright 2010-2019 Will Scullin <scullin@scullinsteel.com>
 *
 * Permission to use, copy, modify, distribute, and sell this software and its
 * documentation for any purpose is hereby granted without fee, provided that
 * the above copyright notice appear in all copies and that both that
 * copyright notice and this permission notice appear in supporting
 * documentation.  No representations are made about the suitability of this
 * software for any purpose.  It is provided "as is" without express or
 * implied warranty.
 */

export default function Apple1IO(text) {
    var _key = 0;
    var _keyReady = false;

    var _displayReady = false;
    var _nextDSP = 0;
    var _buffer = [];

    var LOC = {
        KBD: 0x10,
        KBDRDY: 0x011,
        DSP: 0x12,
        DSPCTL: 0x13
    };

    return {
        start: function() { return 0xd0; },
        end: function() { return 0xd0; },
        read: function(page, off) {
            var result = 0;
            off &= 0x13;
            switch (off) {
            case LOC.KBD:
                // Keyboard
                if (_buffer.length) {
                    result = _buffer.shift().toUpperCase().charCodeAt(0) & 0x7f;
                    _keyReady = (_buffer.length > 0);
                } else {
                    result = _key;
                    _keyReady = false;
                }
                result |= 0x80;
                break;
            case LOC.KBDRDY:
                result = _keyReady ? 0x80 : 0x00;
                break;
            case LOC.DSP:
                // Display
                // result = (Math.random() > 0.5) ? 0x80 : 0x00;
                result = (Date.now() > _nextDSP) ? 0x00 : 0x80;
                break;
            case LOC.DSPCTL:
                break;
            }
            return result;
        },
        write: function(page, off, val) {
            off &= 0x13;
            switch (off) {
            case LOC.KBD:
                break;
            case LOC.KBDRDY:
                break;
            case LOC.DSP:
                // Display
                if (_displayReady) {
                    text.write(val);
                }
                _nextDSP = Date.now() + ((_buffer.length > 0) ? 0 : 17);
                break;
            case LOC.DSPCTL:
                // Don't pretend we care what the value was...
                _displayReady = true;
                break;
            }
        },
        reset: function apple1io_reset() {
            text.clear();
            _buffer = [];
            _keyReady = false;
            _displayReady = false;
        },
        keyUp: function apple1io_keyUp() {
        },
        keyDown: function apple1io_keyDown(key) {
            _key = key;
            _keyReady = true;
        },
        paste: function apple1io_paste(buffer) {
            buffer = buffer.replace(/\/\/.*\n/g, '');
            buffer = buffer.replace(/\n/g, '\r');
            _buffer = buffer.split('');
            _keyReady = true;
        }
    };
}

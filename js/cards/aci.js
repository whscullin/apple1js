import { debug } from '../util';

export default function ACI(cpu, cb) {
    var _last = cpu.cycles();
    var _next = _last;
    var _recording = false;
    var _readOffset = 0;
    var _flip = false;
    var _beKind = false;
    var _progress = 0;

    var rom = [
        0xA9,0xAA,0x20,0xEF,0xFF,0xA9,0x8D,0x20,
        0xEF,0xFF,0xA0,0xFF,0xC8,0xAD,0x11,0xD0,
        0x10,0xFB,0xAD,0x10,0xD0,0x99,0x00,0x02,
        0x20,0xEF,0xFF,0xC9,0x9B,0xF0,0xE1,0xC9,
        0x8D,0xD0,0xE9,0xA2,0xFF,0xA9,0x00,0x85,
        0x24,0x85,0x25,0x85,0x26,0x85,0x27,0xE8,
        0xBD,0x00,0x02,0xC9,0xD2,0xF0,0x56,0xC9,
        0xD7,0xF0,0x35,0xC9,0xAE,0xF0,0x27,0xC9,
        0x8D,0xF0,0x20,0xC9,0xA0,0xF0,0xE8,0x49,
        0xB0,0xC9,0x0A,0x90,0x06,0x69,0x88,0xC9,
        0xFA,0x90,0xAD,0x0A,0x0A,0x0A,0x0A,0xA0,
        0x04,0x0A,0x26,0x24,0x26,0x25,0x88,0xD0,
        0xF8,0xF0,0xCC,0x4C,0x1A,0xFF,0xA5,0x24,
        0x85,0x26,0xA5,0x25,0x85,0x27,0xB0,0xBF,
        0xA9,0x40,0x20,0xCC,0xC1,0x88,0xA2,0x00,
        0xA1,0x26,0xA2,0x10,0x0A,0x20,0xDB,0xC1,
        0xD0,0xFA,0x20,0xF1,0xC1,0xA0,0x1E,0x90,
        0xEC,0xA6,0x28,0xB0,0x98,0x20,0xBC,0xC1,
        0xA9,0x16,0x20,0xCC,0xC1,0x20,0xBC,0xC1,
        0xA0,0x1F,0x20,0xBF,0xC1,0xB0,0xF9,0x20,
        0xBF,0xC1,0xA0,0x3A,0xA2,0x08,0x48,0x20,
        0xBC,0xC1,0x68,0x2A,0xA0,0x39,0xCA,0xD0,
        0xF5,0x81,0x26,0x20,0xF1,0xC1,0xA0,0x35,
        0x90,0xEA,0xB0,0xCD,0x20,0xBF,0xC1,0x88,
        0xAD,0x81,0xC0,0xC5,0x29,0xF0,0xF8,0x85,
        0x29,0xC0,0x80,0x60,0x86,0x28,0xA0,0x42,
        0x20,0xE0,0xC1,0xD0,0xF9,0x69,0xFE,0xB0,
        0xF5,0xA0,0x1E,0x20,0xE0,0xC1,0xA0,0x2C,
        0x88,0xD0,0xFD,0x90,0x05,0xA0,0x2F,0x88,
        0xD0,0xFD,0xBC,0x00,0xC0,0xA0,0x29,0xCA,
        0x60,0xA5,0x26,0xC5,0x24,0xA5,0x27,0xE5,
        0x25,0xE6,0x26,0xD0,0x02,0xE6,0x27,0x60
    ];

    return {
        start: function aci_start() {
            return 0xc0;
        },
        end: function aci_end() {
            return 0xc1;
        },
        read: function aci_read(page, off) {
            var now = cpu.cycles();
            var result = rom[off];
            if (page == 0xc0) {
                if (_recording) {
                    var delta = now - _last;
                    this.buffer.push(delta);
                    _last = now;
                } else {
                    var progress;
                    if (_readOffset < this.buffer.length) {
                        if (now > _next) {
                            if ((_readOffset % 1000) == 0) {
                                debug('Read ' + (_readOffset / 1000));
                            }
                            _flip = !_flip;
                            _next = now + this.buffer[_readOffset++];
                        }
                    }
                    result = _flip ? rom[off | 0x01] : rom[off & 0xfe];

                    progress = Math.round(_readOffset / this.buffer.length * 100) / 100;
                    if (_progress != progress) {
                        _progress = progress;
                        cb.progress(_progress);
                    }
                }
            } else {
                if (cpu.sync()) {
                    switch (off) {
                    case 0x00:
                        _recording = false;
                        _beKind = true;
                        debug('Entering ACI CLI');
                        break;
                    case 0x63:
                        if (_recording) {
                            this.buffer.push(5000000);
                            _recording = false;
                        }
                        debug('Exiting ACI CLI');
                        break;
                    case 0x70: // WRITE
                        _recording = true;
                        if (_beKind) {
                            _beKind = false;
                            this.buffer = [];
                        }
                        debug('Start write');
                        _last = now;
                        break;
                    //case 0x7c: // WBITLOOP:
                        // _debug = true;
                        // debug("Write bit loop");
                        // break;
                    case 0x8d: // READ
                        _recording = false;
                        debug('Start read');
                        if (_beKind) {
                            _readOffset = 0;
                            _next = now + 5000000;
                            _beKind = false;

                            cb.progress(0);
                        }
                        break;
                    default:
                        break;
                    }
                }
            }
            return result;
        },
        write: function aci_write() {},

        getState: function aci_getState() { return {}; },
        setState: function aci_setState() {},

        setData: function aci_setData(data) {
            var seg, idx, jdx, d, b;
            this.buffer = [];
            for (seg = 0; seg < data.length; seg++) {
                for (idx = 0; idx < 16384; idx++) {
                    this.buffer.push(592);
                }
                this.buffer.push(180);
                this.buffer.push(238);
                d = data[seg];
                for (idx = 0; idx < d.length; idx++) {
                    b = d[idx];
                    for (jdx = 0; jdx < 8; jdx++) {
                        if (b & 0x80) {
                            this.buffer.push(473);
                            this.buffer.push(473);
                        } else {
                            this.buffer.push(238);
                            this.buffer.push(238);
                        }
                        b <<= 1;
                    }
                }
                this.buffer.push(5000000);
            }
        },
        buffer: []
    };
}

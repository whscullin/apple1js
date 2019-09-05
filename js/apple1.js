import Apple1IO from './apple1io';
import CPU6502 from './cpu6502';
import Prefs from './prefs';
import RAM from './ram';
import { TextPage } from './canvas1';
import { debug, hup } from './util';

import Basic from './roms/basic';
import Bios from './roms/bios';
import Krusader from './roms/krusader';

import ACI from './cards/aci';

import { mapKeyEvent, KeyBoard } from './ui/keyboard';

var DEBUG=false;
var TRACE=true;
var skidmarks = [];

var focused = false;
var startTime = Date.now();
var lastCycles = 0;
var renderedFrames = 0, lastFrames = 0;
var paused = false;

var hashtag;
var prefs = new Prefs();
var runTimer = null;
var cpu = new CPU6502();

var krusader = window.location.hash == '#krusader';

var raml, ramh, rom, aci, io, text, keyboard;

// 32K base memory. Should be 0x0f for 4K, 0x1f for 8K, 0x3f for 16K
raml = new RAM(0x00, 0x7f);
text = new TextPage();
text.init();

aci = new ACI(cpu, { progress: function(val) {
    //$("#takeup").css("width", val * 75);
    //$("#supply").css("width", 75 - val * 75);
    $('#tape').css('width', val * 100);
}});
io = new Apple1IO(text);

if (krusader) {
    ramh = null;
    rom = new Krusader();
} else {
    // ramh = new RAM(0xe0, 0xef); // 4K ACI memory.
    ramh = new Basic();
    rom = new Bios();
}
keyboard = new KeyBoard(cpu, io, text);

cpu.addPageHandler(raml);
if (ramh) {
    cpu.addPageHandler(ramh);
}
cpu.addPageHandler(rom);

cpu.addPageHandler(aci);
cpu.addPageHandler(io);

var showFPS = false;

//aci.setData([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88])
//aci.setData([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07])
//aci.setData([0x01,0x23,0x45,0x67,0x89,0xab,0xcd,0xef])

//aci.setData(tapes['BASIC']);
aci.setData(window.tapes['Microchess'].tracks);

// Audio Buffer Source
var context;
if (typeof window.webkitAudioContext != 'undefined') {
    context = new window.webkitAudioContext();
}

function doLoadLocal() {
    var files = $('#local_file').prop('files');
    if (files.length == 1) {
        var file = files[0];
        var fileReader = new FileReader();
        fileReader.onload = function(ev) {
            context.decodeAudioData(ev.target.result, function(buffer) {
                var buf = [];
                var data = buffer.getChannelData(0);
                var old = (data[0] > 0.25);
                var last = 0;
                for (var idx = 1; idx < data.length; idx++) {
                    var current = (data[idx] > 0.25);
                    if (current != old) {
                        var delta = idx - last;
                        buf.push(parseInt(delta / buffer.sampleRate * 1023000));
                        old = current;
                        last = idx;
                    }
                }
                aci.buffer = buf;
                $('#local').dialog('close');
            });
        };
        fileReader.readAsArrayBuffer(file);
    }
}

export function openLoadLocal() {
    $('#local').dialog('open');
}

function updateKHz() {
    var now = Date.now();
    var ms = now - startTime;
    var cycles = cpu.cycles();
    var delta;

    if (showFPS) {
        delta = renderedFrames - lastFrames;
        var fps = parseInt(delta/(ms/1000));
        $('#khz').text( fps + 'fps');
    } else {
        delta = cycles - lastCycles;
        var khz = parseInt(delta/ms);
        $('#khz').text( khz + 'KHz');
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

export function toggleSpeed()
{
    throttling = $('#speed_toggle').prop('checked');
    if (runTimer) {
        run();
    }
}

export function setTurboTape(val) {
    turbotape = val;
}

var _requestAnimationFrame =
    window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;

function run(pc) {
    if (runTimer) {
        clearInterval(runTimer);
    }

    if (pc) {
        cpu.setPC(pc);
    }

    var ival = 30, step = 1023 * ival, stepMax = step;

    if (!throttling) {
        ival = 1;
    }

    var now, last = Date.now();
    var runFn = function() {
        now = Date.now();
        renderedFrames++;
        if (_requestAnimationFrame) {
            step = (now - last) * 1023;
            last = now;
            if (step > stepMax) {
                step = stepMax;
            }
        }
        if (document.location.hash != hashtag) {
            hashtag = document.location.hash;
        }
        if (!loading) {
            if (DEBUG) {
                cpu.stepCyclesDebug(TRACE ? 1 : step, function() {
                    var line = cpu.dumpRegisters() + ' ' + cpu.dumpPC();
                    if (TRACE) {
                        debug(line);
                    } else {
                        skidmarks.push();
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
        if (!paused && _requestAnimationFrame) {
            _requestAnimationFrame(runFn);
        }
    };
    if (_requestAnimationFrame) {
        _requestAnimationFrame(runFn);
    } else {
        runTimer = setInterval(runFn, ival);
    }
}

function stop() {
    if (runTimer) {
        clearInterval(runTimer);
    }
    runTimer = null;
}

function reset()
{
    cpu.reset();
}

export function loadBinary(bin) {
    stop();
    for (var idx = 0; idx < bin.length; idx++) {
        var pos = bin.start + idx;
        cpu.write(pos >> 8, pos & 0xff, bin.data[idx]);
    }
    run(bin.start);
}

var _key;
function _keydown(evt) {
    if (evt.keyCode === 112) {
        cpu.reset();
    } else if (evt.keyCode === 113) {
        if (document.webkitIsFullScreen) {
            document.webkitCancelFullScreen();
        } else {
            var elem = document.getElementById('display');
            elem.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    } else if (evt.keyCode == $.ui.keyCode.SHIFT) {
        keyboard.shiftKey(true);
    } else if (evt.keyCode == $.ui.keyCode.CONTROL) {
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

function _keyup(evt) {
    _key = 0xff;

    if (evt.keyCode == $.ui.keyCode.SHIFT) {
        keyboard.shiftKey(false);
    } else if (evt.keyCode == $.ui.keyCode.CONTROL) {
        keyboard.controlKey(false);
    } else {
        if (!focused) {
            io.keyUp();
        }
    }
}

var _updateScreenTimer = null;

export function updateScreen() {
    var green = $('#green_screen').prop('checked');
    var scanlines = $('#show_scanlines').prop('checked');

    text.green(green);
    text.scanlines(scanlines);

    if (!_updateScreenTimer)
        _updateScreenTimer =
           setInterval(function() {
               text.refresh();
               clearInterval(_updateScreenTimer);
               _updateScreenTimer = null;
           }, 100);
}

paused = false;
export function pauseRun(b) {
    if (paused) {
        run();
        b.value = 'Pause';
    } else {
        stop();
        b.value = 'Run';
    }
    paused = !paused;
}

export function openLoadText(event) {
    if (event.altKey) {
        $('#local').dialog('open');
    } else {
        $('#input_text').dialog('open');
        $('#text_input').focus();
    }
}

function doLoadText() {
    var text = $('#text_input').val();
    if (!text.indexOf('//Binary')) {
        var lines = text.split('\n');
        $.each(lines, function(_, line) {
            var parts = line.split(': ');
            if (parts.length == 2) {
                var addr;
                if (parts[0].length > 0) {
                    addr = parseInt(parts[0], 16);
                }
                var data = parts[1].split(' ');
                for (var idx = 0; idx < data.length; idx++) {
                    cpu.write(addr >> 8, addr & 0xff, parseInt(data[idx], 16));
                    addr++;
                }
            }
        });
    } else {
        io.paste(text);
    }
    $('#input_text').dialog('close');
}

$(function() {
    hashtag = document.location.hash;

    $('button,input[type=button],a.button').button();

    /*
     * Input Handling
     */

    var canvas = document.getElementById('text');
    var context = canvas.getContext('2d');

    text.setContext(context);

    $(window).keydown(_keydown);
    $(window).keyup(_keyup);

    $('.overscan').bind('paste', function(event) {
        io.paste(event.originalEvent.clipboardData().getData('text/plain'));
        event.preventDefault();
    });

    $('input,textarea').focus(function() { focused = true; });
    $('input,textarea').blur(function() { focused = false; });

    keyboard.create($('#keyboard'));

    if (prefs.havePrefs()) {
        $('input[type=checkbox]').each(function() {
            var val = prefs.readPref(this.id);
            if (val != null)
                this.checked = JSON.parse(val);
        });
        $('input[type=checkbox]').change(function() {
            prefs.writePref(this.id, JSON.stringify(this.checked));
        });
    }

    turbotape = $('#turbo_tape').prop('checked');

    $.each(window.tapes, function(key) {
        $('#tape_select').append(
            '<option name=\'' + key + '\'>' +
                                 key +
                                 '</option>');});

    $('#tape_select').change(function(event) {
        var tape = window.tapes[event.target.value];
        if (!tape) {
            $('#text_input').val('');
            return;
        }
        window.location.hash = event.target.value;
        reset();
        if (turbotape) {
            var trackIdx = 0, script = '';
            var parts = tape.script.split('\n');
            // Ignore part 0 (C100R)
            // Split part 1 into ranges
            var ranges = parts[1].split(' ');
            var idx;
            for (idx = 0; idx < ranges.length; idx++) {
                var range = ranges[idx].split('.');
                var start = parseInt(range[0], 16);
                var end = parseInt(range[1], 16);
                var track = tape.tracks[trackIdx];
                var kdx = 0;
                for (var jdx = start;  jdx <= end; jdx++) {
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
            $('#text_input').val(script);
            $('#tape').css('width', 100);
        } else {
            aci.setData(tape.tracks);
            $('#text_input').val(tape.script);
        }
    });

    // reset();
    run();
    setInterval(updateKHz, 1000);
    updateScreen();

    var cancel = function() { $(this).dialog('close'); };
    $('#options').dialog({ autoOpen: false,
        modal: true,
        width: 320,
        height: 400,
        buttons: {'Close': cancel }});
    $('#input_text').dialog({ autoOpen: false,
        modal: true,
        width: 530,
        buttons: [
            {
                text: 'Cancel',
                click: cancel
            },
            {
                text: 'OK',
                click: doLoadText
            }]});
    $('#local').dialog({ autoOpen: false,
        modal: true,
        width: 530,
        buttons: {'Cancel': cancel, 'OK': doLoadLocal }});

    var tape = hup();
    if (tape) {
        $('#tape_select').val(tape).change();
        doLoadText();
    }
});

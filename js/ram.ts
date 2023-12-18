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

import {base64_decode, base64_encode} from './base64';
import {allocMemPages} from './util';
import type {byte, memory} from '@whscullin/cpu6502';

export interface RAMState {
  start: byte;
  end: byte;
  mem: string;
}

export default class RAM {
  mem: memory;

  constructor(
    private start_page: byte,
    private end_page: byte,
  ) {
    this.mem = allocMemPages(end_page - start_page + 1);

    for (let page = 0; page <= end_page; page++) {
      for (let off = 0; off < 0x100; off++) {
        this.mem[page * 0x100 + off] = 0; // Math.floor(Math.random()*256);
      }
    }
  }

  start() {
    return this.start_page;
  }
  end() {
    return this.end_page;
  }
  read(page: byte, off: byte) {
    return this.mem[(page - this.start_page) * 0x100 + off];
  }
  write(page: byte, off: byte, val: byte) {
    this.mem[(page - this.start_page) * 0x100 + off] = val;
  }

  getState(): RAMState {
    return {
      start: this.start_page,
      end: this.end_page,
      mem: base64_encode(this.mem),
    };
  }

  setState(state: RAMState) {
    this.start_page = state.start;
    this.end_page = state.end;
    this.mem = base64_decode(state.mem);
  }
}

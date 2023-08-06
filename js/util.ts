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

import { byte, word } from './types';

const hex_digits = '0123456789ABCDEF';
const bin_digits = '01';

export function allocMem(size: word) {
  let result;
  if (window.Uint8Array) {
    result = new Uint8Array(size);
  } else {
    result = new Array(size);
  }
  return result;
}

export function allocMemPages(pages: byte) {
  return allocMem(pages * 0x100);
}

export function debug(...msg: unknown[]) {
  /*eslint no-console: 0 */
  console.log(...msg);
}

export function toHex(v: byte, n?: 2 | 4) {
  if (!n) {
    n = v < 256 ? 2 : 4;
  }
  let result = '';
  for (let idx = 0; idx < n; idx++) {
    result = hex_digits[v & 0x0f] + result;
    v >>= 4;
  }
  return result;
}

export function toBinary(v: byte) {
  let result = '';
  for (let idx = 0; idx < 8; idx++) {
    result = bin_digits[v & 0x01] + result;
    v >>= 1;
  }
  return result;
}

export function gup(name: string) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

export function hup() {
  const regex = new RegExp('#(.*)');
  const results = regex.exec(window.location.hash);
  if (!results) return '';
  else return decodeURIComponent(results[1]);
}

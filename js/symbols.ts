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

import type { address } from './types';

export const SYMBOLS: Record<address, string> = {
  0xd010: 'KBD',
  0xd011: 'KBDCR',
  0xd012: 'DSP',
  0xd013: 'DSPCR',

  0xff1f: 'GETLINE',
  0xffef: 'ECHO',
  0xffdc: 'PRBYTE',
  0xffe5: 'PRHEX',
};

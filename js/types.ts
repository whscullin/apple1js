/* Copyright 2023 Will Scullin <scullin@scullinsteel.com>
 *
 * Permission to use, copy, modify, distribute, and sell this software and its
 * documentation for any purpose is hereby granted without fee, provided that
 * the above copyright notice appear in all copies and that both that
 * copyright notice and this permission notice appear in supporting
 * documentation.  No representations are made about the suitability of this
 * software for any purpose.  It is provided "as is" without express or
 * implied warranty.
 */

export type byte = number;

export type word = number;

export type address = word;

export type memory = Uint8Array | byte[];

export interface Memory {
  /** Read a byte. */
  read(page: byte, offset: byte): byte;
  /** Write a byte. */
  write(page: byte, offset: byte, value: byte): void;
}

/** A mapped region of memory. */
export interface MemoryPages extends Memory {
  /** Start page. */
  start(): byte;
  /** End page, inclusive. */
  end(): byte;
}

/**
 * Extracts the members of a constant array as a type. Used as:
 *
 * @example
 * const SOME_VALUES = ['a', 'b', 1, 2] as const;
 * type SomeValues = MemberOf<typeof SOME_VALUES>; // 'a' | 'b' | 1 | 2
 */
export type MemberOf<T extends ReadonlyArray<unknown>> =
  T extends ReadonlyArray<infer E> ? E : never;

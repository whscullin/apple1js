import { flags, CpuState } from "js/cpu6502";
import { byte } from "js/types";
import { toHex } from "js/util";

export const dumpStatusRegister = (sr: byte) =>
  [
    sr & flags.N ? "N" : "-",
    sr & flags.V ? "V" : "-",
    sr & flags.X ? "X" : "-",
    sr & flags.B ? "B" : "-",
    sr & flags.D ? "D" : "-",
    sr & flags.I ? "I" : "-",
    sr & flags.Z ? "Z" : "-",
    sr & flags.C ? "C" : "-",
  ].join("");

const detail = !!process.env.JEST_DETAIL;

export function toReadableState(state: CpuState) {
  if (detail) {
    const { pc, sp, a, x, y, s } = state;

    return {
      pc: toHex(pc, 4),
      sp: toHex(sp),
      a: toHex(a),
      x: toHex(x),
      y: toHex(y),
      s: dumpStatusRegister(s),
    };
  } else {
    return state;
  }
}

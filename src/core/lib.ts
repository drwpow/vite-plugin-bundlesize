import stripAnsi from "strip-ansi";

// settings

export const SIZE_CONVERSION = {
  b: 1,
  kb: 10 ** 3,
  mb: 10 ** 6,
  gb: 10 ** 9,
  tb: 10 ** 12, // cheeky
  pb: 10 ** 15, // extra cheeky
};

/** interpret human-readable sizes as bytes */
export function parseSize(size: string): number {
  try {
    const num = Number.parseFloat(size);
    if (Number.isNaN(num)) {
      throw new Error();
    }
    const sizeLower = size.toLocaleLowerCase();
    let suffix: keyof typeof SIZE_CONVERSION = "b";
    if (sizeLower.includes("k")) {
      suffix = "kb";
    } else if (sizeLower.includes("m")) {
      suffix = "mb";
    } else if (sizeLower.includes("g")) {
      suffix = "gb"; // note: "megabyte" includes a "g" but has already been eliminated
    } else if (sizeLower.includes("t")) {
      suffix = "tb";
    } else if (sizeLower.includes("p")) {
      suffix = "pb";
    }
    return num * SIZE_CONVERSION[suffix];
  } catch {
    throw new Error(`Could not parse "${size}". Try this format: "120.5 kB".`);
  }
}

export function padLeft(str: string, length: number): string {
  const len = Math.max(length - stripAnsi(str).length, 0);
  return " ".repeat(len) + str;
}

export function padRight(str: string, length: number): string {
  const len = Math.max(length - stripAnsi(str).length, 0);
  return str + " ".repeat(len);
}

/**
 * ANSI colors
 */
export const SUPPORTS_COLOR =
  process.stdout.isTTY && process.env.NODE_DISABLE_COLOR !== "true";

export const RESET = SUPPORTS_COLOR ? "\u001b[0m" : "";
export const DIM = SUPPORTS_COLOR ? "\u001b[2m" : "";
export const FG_WHITE = SUPPORTS_COLOR ? "\u001b[38:5:15m" : "";
export const FG_BLUE_33 = SUPPORTS_COLOR ? "\u001b[38:5:33m" : "";
export const FG_GREEN_79 = SUPPORTS_COLOR ? "\u001b[38:5:79m" : "";
export const FG_RED_197 = SUPPORTS_COLOR ? "\u001b[38:5:197m" : "";
export const FG_MAGENTA_200 = SUPPORTS_COLOR ? "\u001b[38:5:200m" : "";
export const FG_ORANGE_202 = SUPPORTS_COLOR ? "\u001b[38:5:202m" : "";
export const FG_YELLOW_220 = SUPPORTS_COLOR ? "\u001b[38:5:220m" : "";
export const FG_GRAY_249 = SUPPORTS_COLOR ? "\u001b[38:5:249m" : "";
export const BG_BLACK = SUPPORTS_COLOR ? "\u001b[48:5:0m" : "";

// hack: fix vql types exported incorrectly
declare module "vlq" {
  export function decode(string: string): number[];
  export function encode(array: number[]): string;
  export function fromString(string: string): number[];
  // biome-ignore lint/suspicious/noShadowRestrictedNames: this is for a module
  export function toString(array: number[]): string;
}

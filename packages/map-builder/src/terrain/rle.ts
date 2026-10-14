/**
 * Run-length encoding of mask values (unsigned 16 bits): a sequence of `(value, run length)` pairs,
 * written as variable-length integers and then as base64. A flat chunk is a few bytes; a chunk
 * full of blobs stays small as long as rows are mostly uniform.
 */
const writeVarint = (bytes: number[], value: number): void => {
  let rest = value;
  while (rest >= 0x80) {
    bytes.push((rest & 0x7f) | 0x80);
    rest = Math.floor(rest / 128);
  }
  bytes.push(rest);
};

export function encodeRuns(values: ArrayLike<number>): string {
  const bytes: number[] = [];
  let index = 0;
  while (index < values.length) {
    const value = values[index]!;
    let end = index + 1;
    while (end < values.length && values[end] === value) end += 1;
    writeVarint(bytes, value);
    writeVarint(bytes, end - index);
    index = end;
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.slice(i, i + 0x8000));
  return btoa(binary);
}

/** Decodes into `length` values. Throws when the text is not a valid encoding of exactly that many. */
export function decodeRuns(text: string, length: number): Uint16Array {
  let binary: string;
  try {
    binary = atob(text);
  } catch {
    throw new Error("terrain mask: not valid base64");
  }
  const out = new Uint16Array(length);
  let position = 0;
  let offset = 0;
  const readVarint = (): number => {
    let result = 0;
    let factor = 1;
    for (;;) {
      if (position >= binary.length) throw new Error("terrain mask: truncated run");
      const byte = binary.charCodeAt(position);
      position += 1;
      result += (byte & 0x7f) * factor;
      if ((byte & 0x80) === 0) return result;
      factor *= 128;
      if (factor > 2 ** 35) throw new Error("terrain mask: run too long");
    }
  };
  while (position < binary.length) {
    const value = readVarint();
    const run = readVarint();
    if (value > 0xffff) throw new Error("terrain mask: value out of range");
    if (run === 0 || offset + run > length) throw new Error("terrain mask: runs do not fit the chunk");
    out.fill(value, offset, offset + run);
    offset += run;
  }
  if (offset !== length) throw new Error("terrain mask: runs do not fill the chunk");
  return out;
}

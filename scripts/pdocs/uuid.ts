// UUIDv7 — the `id` `pdocs` writes on a work item.
//
// Version 7 rather than 4 because its first 48 bits are the creation time in
// milliseconds: ids sort in the order the items were filed, which is what a
// backlog wants when nothing else orders it. No dependency — sixteen bytes and
// two bit masks (RFC 9562 §5.7).

/** A UUID, lowercase and hyphenated — the one form `pdocs` writes and compares.
 *  Any version: an id written by another tool (a v4) is still an id. */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * A UUIDv7. `now` and `random` are parameters so a test can pin the output;
 * callers pass neither. `random` supplies the 74 random bits (ten bytes, the
 * version and variant bits masked over).
 */
export function uuidv7(
  now: number = Date.now(),
  random: Uint8Array = crypto.getRandomValues(new Uint8Array(10))
): string {
  if (!Number.isInteger(now) || now < 0 || now >= 2 ** 48)
    throw new RangeError(`uuidv7: timestamp ${now} does not fit in 48 bits`);
  if (random.length < 10)
    throw new RangeError("uuidv7: needs ten random bytes");

  const b = new Uint8Array(16);
  // 48-bit big-endian milliseconds. Division, not shifts: JS shifts are 32-bit.
  let t = now;
  for (let i = 5; i >= 0; i--) {
    b[i] = t % 256;
    t = Math.floor(t / 256);
  }
  b[6] = 0x70 | ((random[0] as number) & 0x0f); // version 7
  b[7] = random[1] as number;
  b[8] = 0x80 | ((random[2] as number) & 0x3f); // variant 10
  for (let i = 9; i < 16; i++) b[i] = random[i - 6] as number;

  const hex = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

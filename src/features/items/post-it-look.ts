// How an item's post-it looks (TICKET-UI-09): colour, tilt and fastening picked from a hash of its id, so they mix
// with no visible pattern yet stay the same for the item on every render. Never Math.random(): the page is
// server-rendered, and a new pick per request would flicker and break hydration.

const colors = ["yellow", "pink", "blue", "green"] as const;
const tilts = ["left", "right"] as const;
const fastenings = ["pin", "tape", "paperclip"] as const;

// A 32-bit integer mix (lowbias32): neighbouring ids land far apart.
const mix = (id: number) => {
  let x = id | 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
};

// Different bits of the hash for each trait, so they don't repeat in step.
export const postItLook = (id: number) => {
  const hash = mix(id);
  return {
    fastening: fastenings[(hash >>> 24) % fastenings.length]!,
    color: colors[hash % colors.length]!,
    tilt: tilts[(hash >>> 16) % tilts.length]!,
  };
};

export type HsvColor = {
  h: number;
  s: number;
  v: number;
};

const NAMED_COLOR_FALLBACKS: Record<string, string> = {
  black: '#000000',
  blue: '#0000ff',
  cyan: '#00ffff',
  gray: '#808080',
  green: '#008000',
  magenta: '#ff00ff',
  orange: '#ffa500',
  purple: '#800080',
  red: '#ff0000',
  white: '#ffffff',
  yellow: '#ffff00',
};

export function isValidHexColor(value: string): boolean {
  return normalizeHexColor(value) !== null;
}

export function normalizeHexColor(value: string): string | null {
  const trimmedValue = value.trim().toLowerCase();

  if (/^#[0-9a-f]{6}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  if (/^#[0-9a-f]{3}$/.test(trimmedValue)) {
    const [, r, g, b] = trimmedValue;

    if (!r || !g || !b) {
      return null;
    }

    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return null;
}

export function resolveCssColorToHex(value: string): string | null {
  const normalizedHex = normalizeHexColor(value);

  if (normalizedHex) {
    return normalizedHex;
  }

  const namedColor = NAMED_COLOR_FALLBACKS[value.trim().toLowerCase()];

  if (namedColor) {
    return namedColor;
  }

  if (typeof document === 'undefined') {
    return null;
  }

  const probe = document.createElement('div');

  probe.style.color = value;

  if (!probe.style.color) {
    return null;
  }

  document.body.appendChild(probe);

  try {
    const computedColor = window.getComputedStyle(probe).color;
    return rgbStringToHex(computedColor);
  } finally {
    document.body.removeChild(probe);
  }
}

export function hexToHsv(value: string): HsvColor {
  const normalizedHex = normalizeHexColor(value) ?? '#777777';
  const [rRaw, gRaw, bRaw] = hexToRgb(normalizedHex);
  const r = rRaw / 255;
  const g = gRaw / 255;
  const b = bRaw / 255;
  const maxChannel = Math.max(r, g, b);
  const minChannel = Math.min(r, g, b);
  const delta = maxChannel - minChannel;

  let hue = 0;

  if (delta !== 0) {
    if (maxChannel === r) {
      hue = 60 * (((g - b) / delta) % 6);
    } else if (maxChannel === g) {
      hue = 60 * ((b - r) / delta + 2);
    } else {
      hue = 60 * ((r - g) / delta + 4);
    }
  }

  return {
    h: hue < 0 ? hue + 360 : hue,
    s: maxChannel === 0 ? 0 : delta / maxChannel,
    v: maxChannel,
  };
}

export function hsvToHex(color: HsvColor): string {
  const hue = normalizeHue(color.h);
  const saturation = clampUnit(color.s);
  const value = clampUnit(color.v);
  const chroma = value * saturation;
  const huePrime = hue / 60;
  const secondary = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const matchValue = value - chroma;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = secondary;
  } else if (huePrime < 2) {
    red = secondary;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = secondary;
  } else if (huePrime < 4) {
    green = secondary;
    blue = chroma;
  } else if (huePrime < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  return rgbToHex(
    Math.round((red + matchValue) * 255),
    Math.round((green + matchValue) * 255),
    Math.round((blue + matchValue) * 255),
  );
}

function hexToRgb(value: string): [number, number, number] {
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
}

function rgbToHex(red: number, green: number, blue: number): string {
  return `#${toHexChannel(red)}${toHexChannel(green)}${toHexChannel(blue)}`;
}

function toHexChannel(channel: number): string {
  return Math.max(0, Math.min(255, channel)).toString(16).padStart(2, '0');
}

function rgbStringToHex(value: string): string | null {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);

  if (!match) {
    return null;
  }

  return rgbToHex(
    Number.parseInt(match[1] ?? '', 10),
    Number.parseInt(match[2] ?? '', 10),
    Number.parseInt(match[3] ?? '', 10),
  );
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalizeHue(value: number): number {
  const modulo = value % 360;
  return modulo < 0 ? modulo + 360 : modulo;
}

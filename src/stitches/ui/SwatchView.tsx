import { useId, useMemo, useState, type ReactNode } from 'react';
import { readDevice, writeDevice } from '../../storage/device';
import { SWATCH_COLORS, drawSwatch, type Shape, type SwatchSpec } from '../swatch';

function paint(s: Shape, key: number): ReactNode {
  switch (s.t) {
    case 'ellipse':
      return (
        <ellipse
          key={key}
          cx={s.cx}
          cy={s.cy}
          rx={s.rx}
          ry={s.ry}
          transform={s.rot ? `rotate(${s.rot} ${s.cx} ${s.cy})` : undefined}
          fill={s.fill ?? 'none'}
          stroke={s.stroke}
          strokeWidth={s.sw}
        />
      );
    case 'path':
      return (
        <path
          key={key}
          d={s.d}
          fill={s.fill ?? 'none'}
          stroke={s.stroke}
          strokeWidth={s.sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'group':
      return (
        <g key={key} transform={`translate(${s.x} ${s.y}) rotate(${s.rot})`}>
          {s.children.map(paint)}
        </g>
      );
  }
}

/** A drawn swatch of a stitch, in a yarn color. */
export function SwatchView({ spec, color, label, className }: { spec: SwatchSpec; color: string; label: string; className?: string }) {
  const sw = useMemo(() => drawSwatch(spec, color), [spec, color]);
  const clip = `sw${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg viewBox={`0 0 ${sw.width} ${sw.height}`} role="img" aria-label={label} className={className}>
      <defs>
        <clipPath id={clip}>
          <rect width={sw.width} height={sw.height} rx={6} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>{sw.shapes.map(paint)}</g>
    </svg>
  );
}

/** The yarn color swatches are shown in, remembered on this device. */
export function useSwatchColor(): [string, (hex: string) => void] {
  const [hex, setHex] = useState(() => {
    const saved = readDevice('swatch-color');
    return SWATCH_COLORS.some((c) => c.hex === saved) ? saved! : SWATCH_COLORS[1]!.hex;
  });
  return [
    hex,
    (h) => {
      writeDevice('swatch-color', h);
      setHex(h);
    },
  ];
}

export function SwatchColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  return (
    <div className="color-picker" role="radiogroup" aria-label="Yarn color">
      {SWATCH_COLORS.map((c) => (
        <button
          key={c.hex}
          type="button"
          role="radio"
          aria-checked={c.hex === value}
          aria-label={c.name}
          title={c.name}
          className="swatch-btn"
          onClick={() => onChange(c.hex)}
        >
          <span className="swatch" style={{ background: c.hex }} />
        </button>
      ))}
    </div>
  );
}

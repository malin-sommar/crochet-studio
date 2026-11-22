import { useState } from 'react';

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/** A number input that only changes the value when you leave it or press Enter. */
export function NumberField({
  label,
  value,
  min,
  max,
  decimals = 0,
  onChange,
  suffix,
  testId,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  decimals?: number;
  onChange: (v: number | null) => void;
  suffix?: string;
  testId?: string;
}) {
  const show = (v: number | null) => (v === null ? '' : String(Math.round(v * 10 ** decimals) / 10 ** decimals));
  const [text, setText] = useState(show(value));
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setText(show(value));
  }
  const commit = () => {
    const t = text.trim().replace(',', '.');
    if (t === '') {
      onChange(null);
      return;
    }
    const n = Number(t);
    if (!Number.isFinite(n)) {
      setText(show(value));
      return;
    }
    const v = clamp(decimals ? Math.round(n * 10 ** decimals) / 10 ** decimals : Math.round(n), min, max);
    setText(show(v));
    if (v !== value) onChange(v);
  };
  return (
    <label className="field">
      <span>{label}</span>
      <span className="with-suffix">
        <input
          type="text"
          inputMode={decimals ? 'decimal' : 'numeric'}
          value={text}
          data-testid={testId}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
          }}
        />
        {suffix && <span className="muted">{suffix}</span>}
      </span>
    </label>
  );
}

/** A whole number with big − and + buttons, for counts you change often on a phone. */
export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <span className="stepper-label">{label}</span>
      <span className="stepper-controls">
        <button type="button" className="icon-btn" aria-label={`Fewer: ${label}`} disabled={value <= min} onClick={() => onChange(clamp(value - 1, min, max))}>
          −
        </button>
        <StepperInput value={value} min={min} max={max} label={label} onChange={onChange} />
        <button type="button" className="icon-btn" aria-label={`More: ${label}`} disabled={value >= max} onClick={() => onChange(clamp(value + 1, min, max))}>
          +
        </button>
        {suffix && <span className="muted">{suffix}</span>}
      </span>
    </div>
  );
}

function StepperInput({ value, min, max, label, onChange }: { value: number; min: number; max: number; label: string; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setText(String(value));
  }
  const commit = () => {
    const n = Math.round(Number(text));
    const v = Number.isFinite(n) ? clamp(n, min, max) : value;
    setText(String(v));
    if (v !== value) onChange(v);
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
      }}
    />
  );
}

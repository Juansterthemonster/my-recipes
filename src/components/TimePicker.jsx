import { translate } from '../i18n'

export function toMins(h, m) {
  const total = parseInt(h || 0) * 60 + parseInt(m || 0)
  return total > 0 ? total : null
}

export function fromMins(totalMins) {
  if (!totalMins) return { hours: 0, minutes: 0 }
  return { hours: Math.floor(totalMins / 60), minutes: totalMins % 60 }
}

export function formatTime(totalMins) {
  if (!totalMins) return null
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h > 0 && m > 0) return `${h}h ${m}${translate('time.min')}`
  if (h > 0) return `${h}h`
  return `${m}${translate('time.min')}`
}

export default function TimePicker({ label, hours, minutes, onHoursChange, onMinutesChange }) {
  return (
    <div className="flex-1">
      <label className="block text-[11px] font-medium text-[color:var(--field-label)] uppercase tracking-widest mb-2">{label}</label>
      <div className="flex gap-1.5 items-center">
        <div className="relative flex-1">
          <input
            type="number"
            min="0"
            max="48"
            value={hours || ''}
            onChange={e => onHoursChange(e.target.value)}
            placeholder="0"
            className="w-full bg-[color:var(--field-bg)] border border-[color:var(--field-border)] rounded-xl px-3 py-2.5 text-[14px] text-[color:var(--field-text)] outline-none placeholder-[color:var(--field-placeholder)] pr-7"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[color:var(--field-placeholder)] pointer-events-none">h</span>
        </div>
        <div className="relative flex-1">
          <input
            type="number"
            min="0"
            max="59"
            value={minutes || ''}
            onChange={e => onMinutesChange(e.target.value)}
            placeholder="0"
            className="w-full bg-[color:var(--field-bg)] border border-[color:var(--field-border)] rounded-xl px-3 py-2.5 text-[14px] text-[color:var(--field-text)] outline-none placeholder-[color:var(--field-placeholder)] pr-7"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[color:var(--field-placeholder)] pointer-events-none">m</span>
        </div>
      </div>
    </div>
  )
}

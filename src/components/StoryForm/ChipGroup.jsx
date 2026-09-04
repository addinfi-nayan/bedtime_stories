export default function ChipGroup({ options, selected = [], onSelect, single = false }) {
  return (
    <div className="chip-group">
      {options.map((opt) => (
        <button
          key={opt}
          className={`chip${selected.includes(opt) ? ' chip-selected' : ''}`}
          onClick={() => onSelect(opt)}
          type="button"
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

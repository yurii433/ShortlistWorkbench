type Props = {
  label: string;
  placeholder?: string;
  selected: readonly string[];
  onChange: (next: string[]) => void;
};

/** Free-text search, stored as a one-item list like every other filter. */
export function FilterTextInput({
  label,
  placeholder,
  selected,
  onChange,
}: Props) {
  return (
    <label className="filter-field">
      {label}
      <input
        type="search"
        value={selected[0] ?? ""}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value ? [event.target.value] : [])
        }
      />
    </label>
  );
}
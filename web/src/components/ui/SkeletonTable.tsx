type Props = {
  columns: string[];
  rows?: number;
};

/** Placeholder rows shown while a list loads, shaped like the real table. */
export function SkeletonTable({ columns, rows = 8 }: Props) {
  return (
    <table aria-hidden="true">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column}>{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, index) => (
          <tr key={index} className="skeleton-row">
            {columns.map((column, cell) => (
              <td key={column}>
                <span
                  className="skeleton-bar"
                  style={{ width: `${90 - cell * 15}%` }}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

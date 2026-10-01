type Props = {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
};

export function Pager({ page, pageCount, onPage }: Props) {
  return (
    <div className="pager">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} / {pageCount}
      </span>
      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}

type Props = {
  message: string;
  onRetry: () => void;
};

/** A failed request always offers a way back. */
export function ErrorState({ message, onRetry }: Props) {
  return (
    <div>
      <p className="error">{message}</p>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

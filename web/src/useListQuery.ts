import { useCallback, useEffect, useState } from "react";
import type React from "react";
import type { ListResponse } from "./api";

/** The subset a list view needs; `setItems` stays with the page that mutates rows. */
export type ListView<T> = Pick<
  ListState<T>,
  "items" | "loading" | "error" | "reload"
>;

export type ListState<T> = {
  items: T[];
  total: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** Lets a caller patch a row in place, e.g. after an optimistic update. */
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
};

/**
 * Fetches a paged list whenever `fetcher` changes, exposing the honest states a
 * list needs: loading, error and items. Late responses from a superseded request
 * are discarded, so rapid filter changes cannot render stale rows.
 */
export function useListQuery<T>(
  fetcher: () => Promise<ListResponse<T>>,
  errorMessage: string,
): ListState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);

    fetcher()
      .then((data) => {
        if (!current) return;
        setItems(data.items);
        setTotal(data.total);
      })
      .catch(() => {
        if (current) setError(errorMessage);
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [fetcher, errorMessage, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return { items, total, loading, error, reload, setItems };
}

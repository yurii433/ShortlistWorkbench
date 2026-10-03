import { useCallback, useEffect, useState } from "react";
import type { ListResponse } from "../api";

/**
 * State shape for a list view.
 * Use `ListView<T>` when you only need to READ the list state (items, loading, error).
 * Use `ListState<T>` when you also need to UPDATE the items (setItems).
 */
export type ListView<T> = Pick<ListState<T>, "items" | "loading" | "error" | "reload">;

export type ListState<T> = {
  items: T[];
  total: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
};

/**
 * Hook that fetches a list of items and manages loading/error states.
 * 
 * @param fetcher - A function that fetches data from the server. Should return a promise that resolves to { items: T[], total: number }
 * @param errorMessage - The error message to display if the fetch fails
 * @returns Object containing items, total count, loading state, error state, reload function, and setItems updater
 * 
 * Example usage:
 * ```ts
 * const { items, loading, error, reload } = useListQuery(
 *   () => api.getList({ page: currentPage, pageSize: 10 }),
 *   "Failed to load list"
 * );
 * ```
 */
export function useListQuery<T>(
  fetcher: () => Promise<ListResponse<T>>,
  errorMessage: string,
): ListState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadCounter, setReloadCounter] = useState(0);

  useEffect(() => {
    let requestIsValid = true;

    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (!requestIsValid) return;
        setItems(result.items);
        setTotal(result.total);
      })
      .catch(() => {
        if (requestIsValid) setError(errorMessage);
      })
      .finally(() => {
        if (requestIsValid) setLoading(false);
      });

    return () => {
      requestIsValid = false;
    };
  }, [fetcher, errorMessage, reloadCounter]);

  const reload = useCallback(() => {
    setReloadCounter((count) => count + 1);
  }, []);

  return { items, total, loading, error, reload, setItems };
}

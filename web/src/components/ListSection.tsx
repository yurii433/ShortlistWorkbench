import type { ReactNode } from "react";
import type { ListView } from "../useListQuery";
import { ErrorState } from "./ErrorState";
import { SkeletonTable } from "./SkeletonTable";

type Props<T> = {
  state: ListView<T>;
  columns: string[];
  emptyMessage: string;
  children: (items: T[]) => ReactNode;
};

/**
 * Renders the four states every list has to handle: loading, failed, empty and
 * populated. Callers only write the table itself.
 */
export function ListSection<T>({ state, columns, emptyMessage, children }: Props<T>) {
  if (state.loading) {
    return <SkeletonTable columns={columns} />;
  }
  if (state.error) {
    return <ErrorState message={state.error} onRetry={state.reload} />;
  }
  if (state.items.length === 0) {
    return <p className="empty">{emptyMessage}</p>;
  }
  return <>{children(state.items)}</>;
}

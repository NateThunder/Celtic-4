"use client";

import { type ReactNode, useCallback, useEffect, useRef } from "react";

type EqualHeightCardGridProps = {
  className: string;
  children: ReactNode;
};

function isExpandedCard(card: HTMLElement): boolean {
  return card.querySelector('[aria-expanded="true"]') !== null;
}

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function EqualHeightCardGrid({ className, children }: EqualHeightCardGridProps) {
  const gridRef = useRef<HTMLUListElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const syncRowHeights = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const cards = Array.from(grid.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
    if (cards.length === 0) return;

    cards.forEach((card) => {
      card.style.minHeight = "";
    });

    // Keep each card's collapsed height up to date so expanded cards don't set the row baseline.
    cards.forEach((card) => {
      if (!isExpandedCard(card)) {
        card.dataset.collapsedHeight = `${card.offsetHeight}`;
      }
    });

    const rows: HTMLElement[][] = [];
    let currentRowTop: number | null = null;

    cards.forEach((card) => {
      const top = card.offsetTop;
      if (currentRowTop === null || Math.abs(top - currentRowTop) > 1) {
        rows.push([card]);
        currentRowTop = top;
        return;
      }
      rows[rows.length - 1].push(card);
    });

    rows.forEach((rowCards) => {
      const rowHeight = rowCards.reduce((maxHeight, card) => {
        if (isExpandedCard(card)) {
          const collapsedHeight = toNumber(card.dataset.collapsedHeight);
          if (collapsedHeight !== null) return Math.max(maxHeight, collapsedHeight);
        }
        return Math.max(maxHeight, card.offsetHeight);
      }, 0);

      if (rowHeight === 0) return;

      rowCards.forEach((card) => {
        card.style.minHeight = `${rowHeight}px`;
      });
    });
  }, []);

  const queueSync = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      syncRowHeights();
    });
  }, [syncRowHeights]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    queueSync();

    const resizeObserver = new ResizeObserver(() => {
      queueSync();
    });

    resizeObserver.observe(grid);
    Array.from(grid.children).forEach((card) => {
      if (card instanceof HTMLElement) resizeObserver.observe(card);
    });

    const mutationObserver = new MutationObserver(() => {
      queueSync();
    });
    mutationObserver.observe(grid, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-expanded"],
    });

    window.addEventListener("resize", queueSync);

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", queueSync);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [queueSync]);

  return (
    <ul ref={gridRef} className={className}>
      {children}
    </ul>
  );
}

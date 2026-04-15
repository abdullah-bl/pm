"use client";
import { cn } from "@/lib/utils";

type OverviewCard = {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
};

export function OverviewCards({ cards, columns = 4 }: { cards: OverviewCard[]; columns?: number }) {
  return (
    <div className={cn("grid gap-4", columns === 3 ? "sm:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4")}>
      {cards.map((card) => (
        <div key={card.label} className={cn("rounded-lg border bg-card p-5 space-y-1", card.className)}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
            {card.icon}
          </div>
          <div className="text-2xl font-bold">{card.value}</div>
          {card.description && <p className="text-xs text-muted-foreground">{card.description}</p>}
        </div>
      ))}
    </div>
  );
}

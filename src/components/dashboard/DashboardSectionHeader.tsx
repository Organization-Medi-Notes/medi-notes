"use client";

type DashboardSectionHeaderProps = {
  number: string;
  title: string;
  description: string;
};

export function DashboardSectionHeader({
  number,
  title,
  description,
}: DashboardSectionHeaderProps) {
  return (
    <div className="border-t border-gray-200 pt-8">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
          {number}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

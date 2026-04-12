import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  colorClass: string;
}

export function MetricCard({ title, value, change, trend, icon: Icon, colorClass }: MetricCardProps) {
  return (
    <div className="card-notion flex items-center gap-5">
      <div className={cn("p-4 rounded-xl", colorClass)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold mt-1 text-gray-900">{value}</h3>
        {change && (
          <div className="flex items-center gap-1 mt-1">
            <span className={cn(
              "text-xs font-semibold",
              trend === 'up' ? "text-emerald-600" : trend === 'down' ? "text-rose-600" : "text-gray-500"
            )}>
              {change}
            </span>
            <span className="text-xs text-gray-400">vs mes pasado</span>
          </div>
        )}
      </div>
    </div>
  );
}

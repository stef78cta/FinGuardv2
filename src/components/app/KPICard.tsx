import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  icon?: ReactNode;
  description?: string;
  className?: string;
  highlighted?: boolean;
}

export const KPICard = ({
  label,
  value,
  trend,
  trendLabel,
  icon,
  description,
  className,
  highlighted = false,
}: KPICardProps) => {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <div
      className={cn(
        'kpi-card',
        highlighted && 'border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="kpi-label">{label}</span>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            {icon}
          </div>
        )}
      </div>

      <div className="kpi-value mb-2">{value}</div>

      {(trend !== undefined || trendLabel) && (
        <div className="flex items-center gap-2">
          {trend !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                isPositive && 'bg-emerald-50 text-emerald-700',
                isNegative && 'bg-red-50 text-red-700',
                !isPositive && !isNegative && 'bg-gray-50 text-gray-600'
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : isNegative ? (
                <TrendingDown className="w-3 h-3" />
              ) : null}
              {isPositive && '+'}
              {trend.toFixed(1)}%
            </span>
          )}
          {trendLabel && (
            <span className="text-xs text-gray-500">{trendLabel}</span>
          )}
        </div>
      )}

      {description && (
        <p className="text-xs text-gray-500 mt-2">{description}</p>
      )}
    </div>
  );
};

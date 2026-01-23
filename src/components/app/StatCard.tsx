import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  className?: string;
}

export const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}: StatCardProps) => {
  return (
    <div className={cn('card-app p-5', className)}>
      <div className="flex items-center justify-between mb-4">
        <span className="label-category">{title}</span>
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center text-indigo-600">
            {icon}
          </div>
        )}
      </div>
      <div className="text-2xl font-mono font-bold text-[#0F172A] mb-1">{value}</div>
      {(subtitle || trend) && (
        <div className="flex items-center gap-2 text-sm">
          {trend && (
            <span
              className={cn(
                'font-bold flex items-center gap-1',
                trend.value > 0 && 'text-emerald-500',
                trend.value < 0 && 'text-rose-500',
                trend.value === 0 && 'text-gray-500'
              )}
            >
              {trend.value > 0 ? <TrendingUp className="w-3 h-3" /> : trend.value < 0 ? <TrendingDown className="w-3 h-3" /> : null}
              {trend.value > 0 ? '+' : ''}
              {trend.value.toFixed(1)}%
            </span>
          )}
          {subtitle && (
            <span className="text-gray-500">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};

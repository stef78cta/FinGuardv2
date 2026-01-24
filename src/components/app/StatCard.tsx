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
    <div className={cn('p-3 bg-slate-50 rounded-lg', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            {icon}
          </div>
        )}
      </div>
      <div className="text-sm font-mono font-bold text-slate-900 mt-1">{value}</div>
      {(subtitle || trend) && (
        <div className={cn(
          'text-[10px] font-bold mt-1 flex items-center gap-1',
          trend && trend.value > 0 && 'text-emerald-500',
          trend && trend.value < 0 && 'text-rose-500',
          (!trend || trend.value === 0) && 'text-slate-500'
        )}>
          {trend && (
            <>
              {trend.value > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : trend.value < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : null}
              {trend.value > 0 ? '+' : ''}
              {trend.value.toFixed(1)}%
            </>
          )}
          {subtitle && (
            <span className="text-slate-500 ml-1">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};
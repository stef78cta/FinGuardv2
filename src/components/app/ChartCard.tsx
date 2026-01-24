import { ReactNode } from 'react';
import { Download, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  onExport?: () => void;
  onExpand?: () => void;
  className?: string;
}

export const ChartCard = ({
  title,
  subtitle,
  children,
  actions,
  onExport,
  onExpand,
  className,
}: ChartCardProps) => {
  return (
    <div className={cn('bg-white rounded-[20px] border border-slate-100 overflow-hidden', className)}>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {onExport && (
            <Button variant="ghost" size="icon" onClick={onExport} className="h-8 w-8 rounded-full">
              <Download className="w-4 h-4" />
            </Button>
          )}
          {onExpand && (
            <Button variant="ghost" size="icon" onClick={onExpand} className="h-8 w-8 rounded-full">
              <Maximize2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
};

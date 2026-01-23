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
    <div className={cn('chart-card', className)}>
      <div className="chart-card-header">
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-sm text-foreground-secondary mt-0.5">{subtitle}</p>
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
      <div className="chart-card-content">{children}</div>
    </div>
  );
};

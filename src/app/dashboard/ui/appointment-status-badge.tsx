import type { VariantProps } from 'class-variance-authority';
import { Badge, badgeVariants } from '@/components/ui/badge';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export function appointmentStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'SCHEDULED':
      return 'default';
    case 'CHECKED_IN':
      return 'secondary';
    case 'COMPLETED':
      return 'secondary';
    case 'CANCELLED':
      return 'destructive';
    case 'NO_SHOW':
      return 'outline';
    default:
      return 'outline';
  }
}

export function AppointmentStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge variant={appointmentStatusVariant(status)} className={className}>
      {status}
    </Badge>
  );
}

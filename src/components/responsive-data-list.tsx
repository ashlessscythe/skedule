import type { ReactNode } from 'react';

/**
 * Renders `desktop` from `md` up (table, wide layout) and `mobile` below `md`
 * (stacked rows / cards). Avoids horizontal scroll on small viewports.
 */
export function ResponsiveDataList(props: { desktop: ReactNode; mobile: ReactNode }) {
  return (
    <>
      <div className="hidden md:block">{props.desktop}</div>
      <div className="md:hidden">{props.mobile}</div>
    </>
  );
}

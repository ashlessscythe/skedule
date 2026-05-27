'use client';

import { useState } from 'react';
import { resolveViewerTimeZone } from './time';

/** Stable viewer IANA timezone for the current browser session. */
export function useViewerTimeZone() {
  return useState(() => resolveViewerTimeZone())[0];
}

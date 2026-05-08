'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResponsiveDataList } from '@/components/responsive-data-list';
import { IntakeLinkButton } from './intake-link-button';
import { ClientRowActions } from './client-row-actions';

const PAGE_SIZE = 25;

export type ClientRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  upcomingCount?: number;
};

type SortKey = 'name' | 'createdAt' | 'updatedAt';

function compareLocale(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function sortRows(rows: ClientRow[], sort: SortKey, dir: 'asc' | 'desc') {
  const mult = dir === 'asc' ? 1 : -1;
  const out = [...rows];
  out.sort((x, y) => {
    let c = 0;
    if (sort === 'name') {
      c = compareLocale(`${x.lastName}\t${x.firstName}`, `${y.lastName}\t${y.firstName}`);
    } else if (sort === 'createdAt') {
      c = new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime();
    } else if (sort === 'updatedAt') {
      c = new Date(x.updatedAt).getTime() - new Date(y.updatedAt).getTime();
    }
    if (c !== 0) return c * mult;
    return compareLocale(x.id, y.id) * mult;
  });
  return out;
}

function useQuerySetter() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  return useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === undefined || v === '') next.delete(k);
        else next.set(k, v);
      }
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [router, pathname, sp]
  );
}

export function ClientsList(props: { rows: ClientRow[] }) {
  const sp = useSearchParams();
  const setQuery = useQuerySetter();
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    },
    []
  );

  const sort = (sp.get('sort') as SortKey | null) ?? 'name';
  const sortSafe: SortKey = ['name', 'createdAt', 'updatedAt'].includes(sort ?? '')
    ? (sort as SortKey)
    : 'name';
  const dir = sp.get('dir') === 'desc' ? 'desc' : 'asc';
  const pageRaw = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
  const upcomingOnly = sp.get('upcoming') === '1';
  const q = sp.get('q')?.trim().toLowerCase() ?? '';

  const processed = useMemo(() => {
    let list = props.rows;
    if (q) {
      list = list.filter((r) => {
        const blob = [r.firstName, r.lastName, r.email, r.phone]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return blob.includes(q);
      });
    }
    if (upcomingOnly) {
      list = list.filter((r) => (r.upcomingCount ?? 0) > 0);
    }
    return sortRows(list, sortSafe, dir);
  }, [props.rows, q, upcomingOnly, sortSafe, dir]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const page = Math.min(pageRaw, totalPages);
  const slice = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function patch(updates: Record<string, string | null | undefined>, resetPage?: boolean) {
    if (resetPage) setQuery({ ...updates, page: null });
    else setQuery(updates);
  }

  function toggleSort(next: SortKey) {
    if (next === sortSafe) patch({ dir: dir === 'asc' ? 'desc' : 'asc' }, true);
    else patch({ sort: next, dir: 'asc' }, true);
  }

  const sortIndicator = (key: SortKey) =>
    sortSafe === key ? (dir === 'asc' ? ' ↑' : ' ↓') : '';

  const headerBtn = (key: SortKey, label: string) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 h-8 px-2 font-medium text-muted-foreground hover:text-foreground"
      onClick={() => toggleSort(key)}
    >
      {label}
      <span className="text-xs">{sortIndicator(key)}</span>
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="client-q">Search</Label>
            <Input
              id="client-q"
              className="w-[min(100%,260px)]"
              placeholder="Name, email, phone…"
              defaultValue={sp.get('q') ?? ''}
              key={sp.get('q') ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                if (searchDebounce.current) clearTimeout(searchDebounce.current);
                searchDebounce.current = setTimeout(() => {
                  setQuery({ q: v.trim() || null, page: null });
                }, 300);
              }}
            />
          </div>

          <div className="space-y-1">
            <Label>Sort</Label>
            <Select
              value={sortSafe}
              onValueChange={(v) => patch({ sort: v ?? 'name' }, true)}
            >
              <SelectTrigger className="w-[170px]">
                <span>
                  {sortSafe === 'name'
                    ? 'Name'
                    : sortSafe === 'createdAt'
                      ? 'Created'
                      : 'Updated'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Sort</SelectLabel>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="createdAt">Created</SelectItem>
                  <SelectItem value="updatedAt">Updated</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={upcomingOnly}
              onChange={(e) => patch({ upcoming: e.target.checked ? '1' : null }, true)}
            />
            Upcoming appt
          </label>
        </div>

        <p className="text-xs text-muted-foreground">
          {processed.length} client{processed.length !== 1 ? 's' : ''} match · {PAGE_SIZE} per page
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => patch({ page: String(page - 1) })}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => patch({ page: String(page + 1) })}
          >
            Next
          </Button>
        </div>
      </div>

      <ResponsiveDataList
        desktop={
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{headerBtn('name', 'Name')}</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slice.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm">
                      No clients match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  slice.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm font-medium">
                        {c.firstName} {c.lastName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.email ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.phone ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <IntakeLinkButton clientId={c.id} />
                          <ClientRowActions
                            client={{
                              id: c.id,
                              firstName: c.firstName,
                              lastName: c.lastName,
                              email: c.email,
                              phone: c.phone,
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        }
        mobile={
          <div className="rounded-lg border bg-card">
            {slice.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No clients match your filters.
              </div>
            ) : (
              <ul className="divide-y">
                {slice.map((c) => (
                  <li key={c.id} className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {c.firstName} {c.lastName}
                        </div>
                        <div className="break-all text-sm text-muted-foreground">{c.email ?? '—'}</div>
                        <div className="text-sm text-muted-foreground">{c.phone ?? '—'}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <IntakeLinkButton clientId={c.id} />
                        <ClientRowActions
                          client={{
                            id: c.id,
                            firstName: c.firstName,
                            lastName: c.lastName,
                            email: c.email,
                            phone: c.phone,
                          }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        }
      />
    </div>
  );
}


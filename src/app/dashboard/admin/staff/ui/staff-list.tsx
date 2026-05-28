'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
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
import { StaffMemberRowActions } from './staff-member-row-actions';

const PAGE_SIZE = 25;

export type StaffRow = {
  id: string;
  role: 'ADMIN' | 'STAFF';
  status: 'PENDING' | 'ACTIVE' | 'REJECTED';
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    isActive: boolean;
  };
};

type SortKey = 'name' | 'role';

function compareLocale(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function sortRows(rows: StaffRow[], sort: SortKey, dir: 'asc' | 'desc') {
  const mult = dir === 'asc' ? 1 : -1;
  const out = [...rows];
  out.sort((x, y) => {
    let c = 0;
    if (sort === 'name') {
      const nx = `${x.user.lastName ?? ''}\t${x.user.firstName ?? ''}\t${x.user.email}`;
      const ny = `${y.user.lastName ?? ''}\t${y.user.firstName ?? ''}\t${y.user.email}`;
      c = compareLocale(nx, ny);
    } else if (sort === 'role') {
      c = compareLocale(x.role, y.role);
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

export function StaffList(props: { rows: StaffRow[] }) {
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
  const sortSafe: SortKey = ['name', 'role'].includes(sort ?? '') ? (sort as SortKey) : 'name';
  const dir = sp.get('dir') === 'desc' ? 'desc' : 'asc';
  const pageRaw = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
  const role = sp.get('role')?.trim() ?? '';
  const status = sp.get('status')?.trim() ?? '';
  const isActive = sp.get('isActive')?.trim() ?? '';
  const q = sp.get('q')?.trim().toLowerCase() ?? '';

  const processed = useMemo(() => {
    let list = props.rows;
    if (role === 'ADMIN' || role === 'STAFF') list = list.filter((r) => r.role === role);
    if (status === 'PENDING' || status === 'ACTIVE' || status === 'REJECTED')
      list = list.filter((r) => r.status === status);
    if (isActive === '1') list = list.filter((r) => r.user.isActive);
    if (isActive === '0') list = list.filter((r) => !r.user.isActive);
    if (q) {
      list = list.filter((r) => {
        const blob = [r.user.firstName, r.user.lastName, r.user.email].filter(Boolean).join(' ').toLowerCase();
        return blob.includes(q);
      });
    }
    return sortRows(list, sortSafe, dir);
  }, [props.rows, role, status, isActive, q, sortSafe, dir]);

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
            <Label htmlFor="staff-q">Search</Label>
            <Input
              id="staff-q"
              className="w-[min(100%,260px)]"
              placeholder="Name or email…"
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
            <Label>Role</Label>
            <Select value={role || 'all'} onValueChange={(v) => patch({ role: v === 'all' ? null : v }, true)}>
              <SelectTrigger className="w-[140px]">
                <span>{role || 'All'}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Role</SelectLabel>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                  <SelectItem value="STAFF">STAFF</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={status || 'all'}
              onValueChange={(v) => patch({ status: v === 'all' ? null : v }, true)}
            >
              <SelectTrigger className="w-[150px]">
                <span>{status || 'All'}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Status</SelectLabel>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                  <SelectItem value="REJECTED">REJECTED</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Active user</Label>
            <Select
              value={isActive || 'all'}
              onValueChange={(v) => patch({ isActive: v === 'all' ? null : v }, true)}
            >
              <SelectTrigger className="w-[160px]">
                <span>{isActive === '1' ? 'Active only' : isActive === '0' ? 'Disabled only' : 'All'}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>User</SelectLabel>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="1">Active only</SelectItem>
                  <SelectItem value="0">Disabled only</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {processed.length} member{processed.length !== 1 ? 's' : ''} match · {PAGE_SIZE} per page
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
                  <TableHead>{headerBtn('name', 'User')}</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>{headerBtn('role', 'Role')}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slice.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm">
                      No members match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  slice.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm font-medium">
                        {[m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || '—'}{' '}
                        {!m.user.isActive ? (
                          <Badge variant="secondary" className="ml-2">
                            Disabled
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.user.email}</TableCell>
                      <TableCell>
                        <Badge variant={m.role === 'ADMIN' ? 'default' : 'secondary'}>{m.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.status === 'ACTIVE' ? 'default' : 'secondary'}>{m.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <StaffMemberRowActions
                          member={{
                            id: m.id,
                            role: m.role,
                            status: m.status,
                            email: m.user.email,
                            firstName: m.user.firstName ?? '',
                            lastName: m.user.lastName ?? '',
                            isActive: m.user.isActive,
                          }}
                        />
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
                No members match your filters.
              </div>
            ) : (
              <ul className="divide-y">
                {slice.map((m) => (
                  <li key={m.id} className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {[m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || '—'}
                      </span>
                      {!m.user.isActive ? (
                        <Badge variant="secondary" className="text-xs">
                          Disabled
                        </Badge>
                      ) : null}
                    </div>
                    <div className="break-all text-sm text-muted-foreground">{m.user.email}</div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={m.role === 'ADMIN' ? 'default' : 'secondary'}>{m.role}</Badge>
                      <Badge variant={m.status === 'ACTIVE' ? 'default' : 'secondary'}>{m.status}</Badge>
                    </div>
                    <StaffMemberRowActions
                      member={{
                        id: m.id,
                        role: m.role,
                        status: m.status,
                        email: m.user.email,
                        firstName: m.user.firstName ?? '',
                        lastName: m.user.lastName ?? '',
                        isActive: m.user.isActive,
                      }}
                    />
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


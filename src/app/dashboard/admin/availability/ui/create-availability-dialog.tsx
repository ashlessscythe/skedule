'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

type LocationOption = { id: string; name: string };
type StaffOption = { id: string; label: string };

function findLabel(options: { id: string; label: string }[], id: string) {
  return options.find((o) => o.id === id)?.label ?? '';
}

export function CreateAvailabilityDialog(props: {
  locations: LocationOption[];
  staff: StaffOption[];
}) {
  const [open, setOpen] = useState(false);
  const [locationId, setLocationId] = useState(props.locations[0]?.id ?? '');
  const [staffId, setStaffId] = useState<string>('');
  const [kind, setKind] = useState<'weekly' | 'blockedDate'>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [startTimeLocal, setStartTimeLocal] = useState('09:00');
  const [endTimeLocal, setEndTimeLocal] = useState('17:00');
  const [specificDate, setSpecificDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = useMemo(() => {
    if (!locationId) return false;
    if (kind === 'weekly') return Boolean(startTimeLocal && endTimeLocal);
    return Boolean(specificDate);
  }, [locationId, kind, startTimeLocal, endTimeLocal, specificDate]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          kind === 'weekly'
            ? {
                locationId,
                staffId: staffId || null,
                dayOfWeek,
                startTimeLocal,
                endTimeLocal,
                isBlocked: false,
              }
            : {
                locationId,
                staffId: staffId || null,
                specificDate: new Date(`${specificDate}T00:00:00.000Z`).toISOString(),
                isBlocked: true,
              }
        ),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? 'Unable to create availability.');
        return;
      }
      setOpen(false);
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  const staffOptions = useMemo(
    () => [{ id: '', label: 'All staff' }, ...props.staff],
    [props.staff]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New rule</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New availability rule</DialogTitle>
          <DialogDescription>
            Weekly windows allow booking; blocked dates prevent booking on that date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Location</Label>
              <Select value={locationId} onValueChange={(v) => setLocationId(v ?? '')}>
                <SelectTrigger className="w-full">
                  <span className={locationId ? '' : 'text-muted-foreground'}>
                    {locationId
                      ? props.locations.find((l) => l.id === locationId)?.name
                      : 'Select a location'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Locations</SelectLabel>
                    {props.locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Staff</Label>
              <Select value={staffId} onValueChange={(v) => setStaffId(v ?? '')}>
                <SelectTrigger className="w-full">
                  <span className={staffId ? '' : 'text-muted-foreground'}>
                    {staffId ? findLabel(staffOptions, staffId) : 'All staff'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Staff</SelectLabel>
                    {staffOptions.map((s) => (
                      <SelectItem key={s.id || 'all'} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Rule type</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v === 'blockedDate' ? 'blockedDate' : 'weekly')}
              >
                <SelectTrigger className="w-full">
                  <span>{kind === 'weekly' ? 'Weekly window' : 'Blocked date'}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Types</SelectLabel>
                    <SelectItem value="weekly">Weekly window</SelectItem>
                    <SelectItem value="blockedDate">Blocked date</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {kind === 'weekly' ? (
              <div className="space-y-1">
                <Label>Day of week</Label>
                <Select
                  value={String(dayOfWeek)}
                  onValueChange={(v) => setDayOfWeek(parseInt(v ?? '0', 10))}
                >
                  <SelectTrigger className="w-full">
                    <span>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Days</SelectLabel>
                      {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="specificDate">Date</Label>
                <Input
                  id="specificDate"
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          {kind === 'weekly' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="startTimeLocal">Start (local)</Label>
                <Input
                  id="startTimeLocal"
                  type="time"
                  value={startTimeLocal}
                  onChange={(e) => setStartTimeLocal(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endTimeLocal">End (local)</Label>
                <Input
                  id="endTimeLocal"
                  type="time"
                  value={endTimeLocal}
                  onChange={(e) => setEndTimeLocal(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={loading || !canCreate}>
              {loading ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


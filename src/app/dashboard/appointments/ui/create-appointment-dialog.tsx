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

type Option = { id: string; label: string };
type TypeOption = Option & { durationMinutes?: number };

function findLabel(options: Option[], id: string) {
  return options.find((o) => o.id === id)?.label ?? '';
}

export function CreateAppointmentDialog(props: {
  locations: Option[];
  clients: Option[];
  staff: Option[];
  types: TypeOption[];
}) {
  const [open, setOpen] = useState(false);
  const [locationId, setLocationId] = useState<string>(props.locations[0]?.id ?? '');
  const [clientId, setClientId] = useState<string>(props.clients[0]?.id ?? '');
  const [staffId, setStaffId] = useState<string>('');
  const [typeId, setTypeId] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = useMemo(() => {
    return Boolean(locationId && clientId && startTime && durationMinutes > 0);
  }, [locationId, clientId, startTime, durationMinutes]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) return;
    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      setError('Please enter a valid start time.');
      return;
    }
    if (durationMinutes % 15 !== 0) {
      setError('Duration must be in 15-minute increments.');
      return;
    }
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          locationId,
          clientId,
          staffId: staffId || null,
          typeId: typeId || null,
          startTime: start.toISOString(),
          durationMinutes,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? 'Unable to create appointment.');
        return;
      }
      setOpen(false);
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New appointment</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
          <DialogDescription>
            Times are entered in your device timezone; they will be stored in UTC.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="w-full">
                  <span className={locationId ? '' : 'text-muted-foreground'}>
                    {locationId ? findLabel(props.locations, locationId) : 'Select a location'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Locations</SelectLabel>
                    {props.locations.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="w-full">
                  <span className={clientId ? '' : 'text-muted-foreground'}>
                    {clientId ? findLabel(props.clients, clientId) : 'Select a client'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Clients</SelectLabel>
                    {props.clients.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Service (optional)</Label>
              <Select
                value={typeId}
                onValueChange={(v) => {
                  setTypeId(v);
                  const found = props.types.find((t) => t.id === v);
                  if (found?.durationMinutes) setDurationMinutes(found.durationMinutes);
                }}
              >
                <SelectTrigger className="w-full">
                  <span className={typeId ? '' : 'text-muted-foreground'}>
                    {typeId ? findLabel(props.types, typeId) : 'Select a type'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Appointment types</SelectLabel>
                    <SelectItem value="">None</SelectItem>
                    {props.types.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Staff (optional)</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger className="w-full">
                  <span className={staffId ? '' : 'text-muted-foreground'}>
                    {staffId ? findLabel(props.staff, staffId) : 'Unassigned'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Staff</SelectLabel>
                    <SelectItem value="">Unassigned</SelectItem>
                    {props.staff.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="startTime">Start</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Duration</Label>
              <Select
                value={String(durationMinutes)}
                onValueChange={(v) => setDurationMinutes(parseInt(v, 10))}
              >
                <SelectTrigger className="w-full">
                  <span>{durationMinutes} min</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Duration (minutes)</SelectLabel>
                    {[15, 30, 45, 60, 75, 90, 105, 120].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m} min
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={loading || !canCreate}>
              {loading ? 'Creating…' : 'Create appointment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


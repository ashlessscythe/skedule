'use client';

import { useState } from 'react';
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function StaffMemberRowActions(props: {
  member: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    role: 'ADMIN' | 'STAFF';
    status: 'ACTIVE' | 'PENDING' | 'REJECTED';
  };
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(props.member.email);
  const [firstName, setFirstName] = useState(props.member.firstName);
  const [lastName, setLastName] = useState(props.member.lastName);
  const [isActive, setIsActive] = useState(props.member.isActive);
  const [role, setRole] = useState(props.member.role);
  const [status, setStatus] = useState(props.member.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setEmail(props.member.email);
    setFirstName(props.member.firstName);
    setLastName(props.member.lastName);
    setIsActive(props.member.isActive);
    setRole(props.member.role);
    setStatus(props.member.status);
    setError(null);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/staff/${props.member.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          isActive,
          role,
          status,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? 'Unable to update member.');
        return;
      }
      setOpen(false);
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetForm();
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Edit</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
          <DialogDescription>Update account details and tenant membership.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor={`email-${props.member.id}`}>Email</Label>
            <Input
              id={`email-${props.member.id}`}
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`first-${props.member.id}`}>First name</Label>
              <Input
                id={`first-${props.member.id}`}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`last-${props.member.id}`}>Last name</Label>
              <Input
                id={`last-${props.member.id}`}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Account status</Label>
            <Select
              value={isActive ? 'active' : 'disabled'}
              onValueChange={(v) => setIsActive(v === 'active')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v === 'ADMIN' ? 'ADMIN' : 'STAFF')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STAFF">STAFF</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Membership status</Label>
            <Select
              value={status}
              onValueChange={(v) =>
                setStatus(v === 'PENDING' ? 'PENDING' : v === 'REJECTED' ? 'REJECTED' : 'ACTIVE')
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="PENDING">PENDING</SelectItem>
                <SelectItem value="REJECTED">REJECTED</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

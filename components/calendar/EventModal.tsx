'use client';

import { useState } from 'react';
import { CalendarEvent } from '@/types';
import { format, parseISO, addHours } from 'date-fns';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  AlignLeft,
  Trash2,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface EventModalProps {
  event?: CalendarEvent | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EventModal({ event, onClose, onSaved }: EventModalProps) {
  const isEditing = !!event;
  const now = new Date();
  const defaultStart = addHours(new Date(now.setMinutes(0, 0, 0)), 1);
  const defaultEnd = addHours(defaultStart, 1);

  const [summary, setSummary] = useState(event?.summary || '');
  const [description, setDescription] = useState(event?.description || '');
  const [location, setLocation] = useState(event?.location || '');
  const [isAllDay, setIsAllDay] = useState(event?.isAllDay || false);
  const [startDate, setStartDate] = useState(
    event ? format(parseISO(event.start), isAllDay ? 'yyyy-MM-dd' : "yyyy-MM-dd'T'HH:mm") : format(defaultStart, "yyyy-MM-dd'T'HH:mm")
  );
  const [endDate, setEndDate] = useState(
    event ? format(parseISO(event.end), isAllDay ? 'yyyy-MM-dd' : "yyyy-MM-dd'T'HH:mm") : format(defaultEnd, "yyyy-MM-dd'T'HH:mm")
  );
  const [attendeesRaw, setAttendeesRaw] = useState(
    event?.attendees?.filter((a) => !a.self).map((a) => a.email).join(', ') || ''
  );
  const [addMeet, setAddMeet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!summary.trim()) {
      toast.error('Event title is required');
      return;
    }

    setSaving(true);
    try {
      const attendees = attendeesRaw
        .split(/[,;\s]+/)
        .map((e) => e.trim())
        .filter((e) => e.includes('@'));

      const eventData = {
        summary: summary.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        start: isAllDay ? startDate : new Date(startDate).toISOString(),
        end: isAllDay ? endDate : new Date(endDate).toISOString(),
        isAllDay,
        attendees: attendees.length > 0 ? attendees : undefined,
        addMeet: addMeet || undefined,
      };

      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEditing
            ? { action: 'update', event: { id: event!.id, ...eventData } }
            : { action: 'create', event: eventData }
        ),
      });

      if (!res.ok) throw new Error('Failed to save event');

      toast.success(isEditing ? 'Event updated' : 'Event created');
      onSaved();
      onClose();
    } catch {
      toast.error(isEditing ? 'Failed to update event' : 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', eventId: event.id }),
      });

      if (!res.ok) throw new Error('Failed to delete');

      toast.success('Event deleted');
      onSaved();
      onClose();
    } catch {
      toast.error('Failed to delete event');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-border-subtle bg-bg-secondary shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
          <h2 className="text-sm font-semibold text-text-primary">
            {isEditing ? 'Edit Event' : 'New Event'}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-text-primary transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4 px-5 py-4">
          {/* Title */}
          <div>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Add title"
              className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none transition"
              autoFocus
            />
          </div>

          {/* Date/Time */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-text-muted flex-shrink-0" />
              <label className="flex items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="rounded border-border-subtle"
                />
                All day
              </label>
            </div>
            <div className="flex items-center gap-2 pl-6">
              <Clock className="h-4 w-4 text-text-muted flex-shrink-0" />
              <input
                type={isAllDay ? 'date' : 'datetime-local'}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-xs text-text-primary focus:border-accent-blue focus:outline-none transition"
              />
              <span className="text-xs text-text-muted">to</span>
              <input
                type={isAllDay ? 'date' : 'datetime-local'}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-xs text-text-primary focus:border-accent-blue focus:outline-none transition"
              />
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-text-muted flex-shrink-0" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
              className="flex-1 rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none transition"
            />
          </div>

          {/* Attendees */}
          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 text-text-muted flex-shrink-0 mt-2" />
            <input
              type="text"
              value={attendeesRaw}
              onChange={(e) => setAttendeesRaw(e.target.value)}
              placeholder="Add attendees (comma-separated emails)"
              className="flex-1 rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none transition"
            />
          </div>

          {/* Google Meet */}
          {!isEditing && (
            <div className="flex items-center gap-2 pl-6">
              <Video className="h-4 w-4 text-text-muted flex-shrink-0" />
              <label className="flex items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={addMeet}
                  onChange={(e) => setAddMeet(e.target.checked)}
                  className="rounded border-border-subtle"
                />
                Add Google Meet video conferencing
              </label>
            </div>
          )}

          {/* Description */}
          <div className="flex items-start gap-2">
            <AlignLeft className="h-4 w-4 text-text-muted flex-shrink-0 mt-2" />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description"
              rows={3}
              className="flex-1 rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none transition resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-subtle px-5 py-3.5">
          <div>
            {isEditing && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-accent-red hover:bg-accent-red/10 transition disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-text-secondary hover:bg-bg-hover transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !summary.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-accent-blue px-4 py-2 text-xs font-medium text-white hover:bg-accent-blue/90 transition disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEditing ? 'Save changes' : 'Create event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

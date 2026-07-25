import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function AddSongDialog({ open, onOpenChange, onSubmit }) {
  const [form, setForm] = useState({
    title: '',
    artist: '',
    key: '',
    tempo: '', // Kept as form hook state reference
    notes: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    
    onSubmit({
      title: form.title.trim(),
      artist: form.artist.trim() || null,
      key: form.key.trim() || null,
      bpm: form.tempo ? Number(form.tempo) : null, // 🔑 Maps frontend 'tempo' to database column key 'bpm'
      notes: form.notes.trim() || null,
    });
    
    setForm({ title: '', artist: '', key: '', tempo: '', notes: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Song</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Earth's mysteries"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="artist">Artist / Composer</Label>
            <Input
              id="artist"
              value={form.artist}
              onChange={(e) => setForm({ ...form, artist: e.target.value })}
              placeholder="e.g., Matt Johnson"
            />
          </div>

          {/* Cleaned layout grid split explicitly for Key and BPM */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="e.g., Ab major"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tempo">BPM</Label>
              <Input
                id="tempo"
                type="number"
                value={form.tempo}
                onChange={(e) => setForm({ ...form, tempo: e.target.value })}
                placeholder="120"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Practice notes..."
              className="h-20"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.title.trim()}>Add Song</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
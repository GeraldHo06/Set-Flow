import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AddSongDialog({ open, onOpenChange, onSubmit }) {
  const [form, setForm] = useState({
    title: '',
    artist: '',
    key: '',
    tempo: '', // Kept as form hook state reference
    notes: '',
  });

  const [keyNote, setKeyNote] = useState('none');
  const [keyType, setKeyType] = useState('Major');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    
    onSubmit({
      title: form.title.trim(),
      artist: form.artist.trim() || null,
      key: (keyNote && keyNote !== 'none') ? `${keyNote} ${keyType}` : null,
      bpm: form.tempo ? Number(form.tempo) : null, // 🔑 Maps frontend 'tempo' to database column key 'bpm'
      notes: form.notes.trim() || null,
    });
    
    setForm({ title: '', artist: '', key: '', tempo: '', notes: '' });
    setKeyNote('none');
    setKeyType('Major');
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
              <Label>Key</Label>
              <div className="flex gap-2">
                <Select value={keyNote} onValueChange={setKeyNote}>
                  <SelectTrigger className="w-[110px] bg-background/50">
                    <SelectValue placeholder="No Key" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Key</SelectItem>
                    {['F#', 'F', 'E', 'D#', 'D', 'C#', 'C', 'B', 'Bb', 'A', 'Ab', 'G', 'Gb', 'Eb', 'Db'].map(note => (
                      <SelectItem key={note} value={note}>{note}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={keyType} onValueChange={setKeyType} disabled={!keyNote || keyNote === 'none'}>
                  <SelectTrigger className="w-[100px] bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Major">Major</SelectItem>
                    <SelectItem value="Minor">Minor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tempo">BPM</Label>
              <Input
                id="tempo"
                type="number"
                min={1}
                max={500}
                value={form.tempo}
                onChange={(e) => setForm({ ...form, tempo: e.target.value })}
                placeholder="500 Max"
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
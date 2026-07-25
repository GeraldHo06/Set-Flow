import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function EditSongDialog({ open, onOpenChange, song, onSubmit }) {
  const [form, setForm] = useState({ title: '', artist: '', key: '', tempo: '', duration: '' });

  useEffect(() => {
    if (song) {
      setForm({
        title: song.title || '',
        artist: song.artist || '',
        key: song.key || '',
        tempo: song.tempo || '',
        duration: song.duration || '',
      });
    }
  }, [song]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit({ ...form, tempo: form.tempo ? Number(form.tempo) : undefined });
    onOpenChange(false);
  };

  const field = (label, key, props = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={key} className="text-xs text-muted-foreground">{label}</Label>
      <Input
        id={key}
        value={form[key]}
        onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="bg-background/50"
        {...props}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Song</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          {field('Title *', 'title', { placeholder: 'Song title' })}
          {field('Artist', 'artist', { placeholder: 'Artist name' })}
          <div className="grid grid-cols-3 gap-3">
            {field('Key', 'key', { placeholder: 'e.g. C Major' })}
            {field('BPM', 'tempo', { placeholder: '120', type: 'number', min: 1, max: 400 })}
            {field('Duration', 'duration', { placeholder: '3:45' })}
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.title.trim()}>Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
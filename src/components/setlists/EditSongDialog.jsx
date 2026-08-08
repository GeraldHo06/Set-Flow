import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function EditSongDialog({ open, onOpenChange, song, onSubmit }) {
  const [form, setForm] = useState({ title: '', artist: '', tempo: '', duration: '' });
  const [keyNote, setKeyNote] = useState('none');
  const [keyType, setKeyType] = useState('Major');

  useEffect(() => {
    if (song) {
      setForm({
        title: song.title || '',
        artist: song.artist || '',
        tempo: song.tempo || '',
        duration: song.duration || '',
      });
      // Parse key (e.g. "F# Major", "C Minor", or legacy "Ab major")
      if (song.key) {
        const parts = song.key.trim().split(/\s+/);
        const note = parts[0] || 'none';
        const rawType = parts[1] || 'Major';
        const type = rawType.toLowerCase().startsWith('min') ? 'Minor' : 'Major';
        setKeyNote(note);
        setKeyType(type);
      } else {
        setKeyNote('none');
        setKeyType('Major');
      }
    }
  }, [song]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit({
      ...form,
      key: (keyNote && keyNote !== 'none') ? `${keyNote} ${keyType}` : null,
      tempo: form.tempo ? Math.min(500, Math.max(1, Number(form.tempo))) : undefined
    });
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
          <div className="grid grid-cols-3 gap-3 items-end">
            <div className="space-y-1.5 col-span-1">
              <Label className="text-xs text-muted-foreground">Key</Label>
              <div className="flex gap-1">
                <Select value={keyNote} onValueChange={setKeyNote}>
                  <SelectTrigger className="w-full bg-background/50 h-9 px-2 text-xs">
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
                  <SelectTrigger className="w-full bg-background/50 h-9 px-2 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Major">Major</SelectItem>
                    <SelectItem value="Minor">Minor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {field('BPM', 'tempo', { placeholder: '120', type: 'number', min: 1, max: 500 })}
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
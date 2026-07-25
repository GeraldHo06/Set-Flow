import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const colors = [
  { value: 'amber', class: 'bg-amber-500' },
  { value: 'blue', class: 'bg-blue-500' },
  { value: 'green', class: 'bg-green-500' },
  { value: 'purple', class: 'bg-purple-500' },
  { value: 'red', class: 'bg-red-500' },
  { value: 'pink', class: 'bg-pink-500' },
];

// 🚀 Destructured myGroups from props
export default function CreateSetlistDialog({ open, onOpenChange, onSubmit, myGroups = [] }) {
  const [form, setForm] = useState({ 
    title: '', // Changed key from "name" to "title" to align with your Supabase column
    description: '', 
    color: 'amber',
    group_id: '' // Empty string defaults to Personal Locker
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    
    onSubmit(form);
    setForm({ title: '', description: '', color: 'amber', group_id: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Setlist</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="title">Setlist Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Friday Night Rehearsal"
            />
          </div>

          {/* 👥 Space Assignment Selector (New Feature!) */}
          <div className="space-y-2">
            <Label htmlFor="space">Target Space</Label>
            <select
              id="space"
              value={form.group_id}
              onChange={(e) => setForm({ ...form, group_id: e.target.value })}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">🔒 Personal Locker (Private)</option>
              {myGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  👥 {group.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Notes about this setlist..."
              className="h-20"
            />
          </div>

          {/* Color Selection Buttons */}
          <div className="space-y-2">
            <Label>Color Tag</Label>
            <div className="flex gap-2">
              {colors.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm({ ...form, color: c.value })}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    c.class,
                    form.color === c.value ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110' : 'opacity-60 hover:opacity-100'
                  )}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.title.trim()}>Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
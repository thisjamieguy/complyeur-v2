'use client'

import { useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Pin, Trash2, Edit2, Calendar } from 'lucide-react'
import {
  addNote,
  updateNote,
  deleteNote,
  togglePinNote,
} from '@/app/admin/companies/[id]/notes-actions'

const CATEGORIES = [
  { value: 'general', label: 'General', color: 'bg-slate-100 text-slate-700' },
  { value: 'support', label: 'Support', color: 'bg-blue-100 text-blue-700' },
  { value: 'billing', label: 'Billing', color: 'bg-green-100 text-green-700' },
  { value: 'custom_deal', label: 'Custom Deal', color: 'bg-purple-100 text-purple-700' },
  { value: 'feature_request', label: 'Feature Request', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'bug_report', label: 'Bug Report', color: 'bg-red-100 text-red-700' },
  { value: 'churn_risk', label: 'Churn Risk', color: 'bg-amber-100 text-amber-700' },
  { value: 'onboarding', label: 'Onboarding', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'upsell_opportunity', label: 'Upsell', color: 'bg-pink-100 text-pink-700' },
] as const

type NoteCategory = typeof CATEGORIES[number]['value']

interface Note {
  id: string
  note_content: string
  category: string | null
  is_pinned: boolean | null
  follow_up_date: string | null
  created_at: string
  updated_at: string
  profiles: { full_name: string | null } | null
}

interface NotesTabProps {
  company: {
    id: string
    company_notes: Note[]
  }
}

export function NotesTab({ company }: NotesTabProps) {
  const [isPending, startTransition] = useTransition()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)

  // Form state
  const [noteContent, setNoteContent] = useState('')
  const [noteCategory, setNoteCategory] = useState<NoteCategory>('general')
  const [notePinned, setNotePinned] = useState(false)
  const [noteFollowUp, setNoteFollowUp] = useState('')

  const notes = company.company_notes || []
  const pinnedNotes = notes.filter(n => n.is_pinned)
  const unpinnedNotes = notes.filter(n => !n.is_pinned)

  const resetForm = () => {
    setNoteContent('')
    setNoteCategory('general')
    setNotePinned(false)
    setNoteFollowUp('')
  }

  const handleAddNote = () => {
    if (!noteContent.trim()) {
      toast.error('Please enter note content')
      return
    }

    startTransition(async () => {
      const result = await addNote(company.id, {
        note_content: noteContent,
        category: noteCategory,
        is_pinned: notePinned,
        follow_up_date: noteFollowUp || null,
      })

      if (result.success) {
        toast.success('Note added')
        setShowAddDialog(false)
        resetForm()
      } else {
        toast.error(result.error || 'Failed to add note')
      }
    })
  }

  const handleUpdateNote = () => {
    if (!editingNote || !noteContent.trim()) {
      toast.error('Please enter note content')
      return
    }

    startTransition(async () => {
      const result = await updateNote(editingNote.id, company.id, {
        note_content: noteContent,
        category: noteCategory,
        is_pinned: notePinned,
        follow_up_date: noteFollowUp || null,
      })

      if (result.success) {
        toast.success('Note updated')
        setEditingNote(null)
        resetForm()
      } else {
        toast.error(result.error || 'Failed to update note')
      }
    })
  }

  const handleDeleteNote = () => {
    if (!deletingNoteId) return

    startTransition(async () => {
      const result = await deleteNote(deletingNoteId, company.id)

      if (result.success) {
        toast.success('Note deleted')
        setDeletingNoteId(null)
      } else {
        toast.error(result.error || 'Failed to delete note')
      }
    })
  }

  const handleTogglePin = (note: Note) => {
    startTransition(async () => {
      const result = await togglePinNote(note.id, company.id, !note.is_pinned)

      if (result.success) {
        toast.success(note.is_pinned ? 'Note unpinned' : 'Note pinned')
      } else {
        toast.error(result.error || 'Failed to toggle pin')
      }
    })
  }

  const openEditDialog = (note: Note) => {
    setNoteContent(note.note_content)
    setNoteCategory((note.category as NoteCategory) || 'general')
    setNotePinned(note.is_pinned || false)
    setNoteFollowUp(note.follow_up_date || '')
    setEditingNote(note)
  }

  const getCategoryStyle = (category: string | null) => {
    const cat = CATEGORIES.find(c => c.value === category)
    return cat?.color || 'bg-slate-100 text-slate-700'
  }

  const getCategoryLabel = (category: string | null) => {
    const cat = CATEGORIES.find(c => c.value === category)
    return cat?.label || 'General'
  }

  const renderNoteCard = (note: Note) => (
    <div
      key={note.id}
      className={`p-4 rounded-lg border ${note.is_pinned ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge className={getCategoryStyle(note.category)}>
              {getCategoryLabel(note.category)}
            </Badge>
            {note.is_pinned && (
              <Pin className="h-3 w-3 text-amber-600" />
            )}
            {note.follow_up_date && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Calendar className="h-3 w-3" />
                Follow up: {format(parseISO(note.follow_up_date), 'MMM d, yyyy')}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-900 whitespace-pre-wrap">{note.note_content}</p>
          <p className="text-xs text-slate-500 mt-2">
            {note.profiles?.full_name || 'Admin'} &middot;{' '}
            {format(parseISO(note.created_at), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleTogglePin(note)}
            disabled={isPending}
            title={note.is_pinned ? 'Unpin' : 'Pin'}
          >
            <Pin className={`h-4 w-4 ${note.is_pinned ? 'text-amber-600' : 'text-slate-400'}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEditDialog(note)}
            disabled={isPending}
            title="Edit"
          >
            <Edit2 className="h-4 w-4 text-slate-400" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeletingNoteId(note.id)}
            disabled={isPending}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-900">Customer Notes</h3>
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Note</DialogTitle>
              <DialogDescription>
                Add a note about this customer for future reference.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Note</Label>
                <textarea
                  className="w-full min-h-[100px] px-3 py-2 text-sm border border-slate-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Enter your note..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={noteCategory} onValueChange={(value) => setNoteCategory(value as NoteCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Follow-up Date (optional)</Label>
                  <Input
                    type="date"
                    value={noteFollowUp}
                    onChange={(e) => setNoteFollowUp(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddNote} disabled={isPending}>
                {isPending ? 'Adding...' : 'Add Note'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-slate-500">No notes yet. Add a note to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pinnedNotes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-500">Pinned</h4>
              {pinnedNotes.map(renderNoteCard)}
            </div>
          )}
          {unpinnedNotes.length > 0 && (
            <div className="space-y-2">
              {pinnedNotes.length > 0 && (
                <h4 className="text-sm font-medium text-slate-500">Other Notes</h4>
              )}
              {unpinnedNotes.map(renderNoteCard)}
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingNote} onOpenChange={(open) => {
        if (!open) {
          setEditingNote(null)
          resetForm()
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Note</Label>
              <textarea
                className="w-full min-h-[100px] px-3 py-2 text-sm border border-slate-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={noteCategory} onValueChange={(value) => setNoteCategory(value as NoteCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Follow-up Date</Label>
                <Input
                  type="date"
                  value={noteFollowUp}
                  onChange={(e) => setNoteFollowUp(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingNote(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateNote} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingNoteId} onOpenChange={(open) => !open && setDeletingNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

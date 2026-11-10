import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  Pin,
  Trash2,
  Edit2,
  Tag,
  Filter,
  X,
  Calendar,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { getTodayColombo, formatReadableDate } from '../lib/dateUtils.js';
import { INote, SkillCategory } from '../types/index.js';
import { ConfirmModal } from '../components/ConfirmModal.js';

export function NotesPage() {
  const today = getTodayColombo();
  const [notes, setNotes] = useState<INote[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [showPinnedOnly, setShowPinnedOnly] = useState<boolean>(false);

  // Note Modal state (for add or edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(today);
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formSkill, setFormSkill] = useState<SkillCategory>('general');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [formPinned, setFormPinned] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    noteId: string;
    noteTitle: string;
  }>({
    isOpen: false,
    noteId: '',
    noteTitle: '',
  });

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getNotes({
        skill: selectedSkill !== 'all' ? selectedSkill : undefined,
        tag: selectedTag || undefined,
        pinned: showPinnedOnly ? true : undefined,
        search: search.trim() || undefined,
      });
      setNotes(data);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSkill, selectedTag, showPinnedOnly, search]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Extract all unique tags across notes for the tag dropdown
  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      n.tags?.forEach((t) => set.add(t.toLowerCase()));
    });
    return Array.from(set).sort();
  }, [notes]);

  // Group notes by date (newest date first)
  const groupedNotes = useMemo(() => {
    const groups: { date: string; notes: INote[] }[] = [];
    const dateMap = new Map<string, INote[]>();

    notes.forEach((note) => {
      const d = note.date || today;
      if (!dateMap.has(d)) {
        dateMap.set(d, []);
      }
      dateMap.get(d)!.push(note);
    });

    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));
    sortedDates.forEach((date) => {
      groups.push({ date, notes: dateMap.get(date)! });
    });

    return groups;
  }, [notes, today]);

  const openAddModal = () => {
    setEditingNoteId(null);
    setFormDate(today);
    setFormTitle('');
    setFormBody('');
    setFormSkill('general');
    setFormTags([]);
    setTagInput('');
    setFormPinned(false);
    setModalOpen(true);
  };

  const openEditModal = (note: INote) => {
    setEditingNoteId(note._id);
    setFormDate(note.date);
    setFormTitle(note.title);
    setFormBody(note.body);
    setFormSkill(note.skill);
    setFormTags(note.tags || []);
    setTagInput('');
    setFormPinned(note.pinned);
    setModalOpen(true);
  };

  const handleTogglePin = async (note: INote) => {
    try {
      const updated = await api.updateNote(note._id, { pinned: !note.pinned });
      setNotes((prev) => prev.map((n) => (n._id === note._id ? updated : n)));
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();
    const clean = tagInput.trim().replace(/^,|,$/g, '');
    if (clean && !formTags.includes(clean)) {
      setFormTags([...formTags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setFormTags(formTags.filter((tag) => tag !== t));
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBody.trim()) return;
    setSavingNote(true);
    try {
      if (editingNoteId) {
        await api.updateNote(editingNoteId, {
          date: formDate,
          title: formTitle.trim(),
          body: formBody.trim(),
          skill: formSkill,
          tags: formTags,
          pinned: formPinned,
        });
      } else {
        await api.addNote({
          date: formDate,
          title: formTitle.trim(),
          body: formBody.trim(),
          skill: formSkill,
          tags: formTags,
          pinned: formPinned,
        });
      }
      setModalOpen(false);
      await loadNotes();
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const confirmDeleteNote = async () => {
    try {
      await api.deleteNote(deleteModal.noteId);
      await loadNotes();
    } catch (err) {
      console.error('Failed to delete note:', err);
    } finally {
      setDeleteModal({ isOpen: false, noteId: '', noteTitle: '' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Study Notes
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Short notes grouped by date. Filter by skill, tags, or pinned status.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-3.5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Note</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes content or title..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Skill Filter */}
          <div>
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Skills</option>
              <option value="general">General</option>
              <option value="grammar">Grammar</option>
              <option value="speaking">Speaking</option>
              <option value="listening">Listening</option>
              <option value="reading">Reading</option>
              <option value="writing">Writing</option>
              <option value="vocab">Vocab</option>
            </select>
          </div>

          {/* Tag Filter */}
          <div>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pinned Toggle & Reset */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <button
            type="button"
            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${
              showPinnedOnly
                ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            }`}
          >
            <Pin className={`w-3.5 h-3.5 ${showPinnedOnly ? 'fill-indigo-600' : ''}`} />
            <span>Pinned only</span>
          </button>

          {(search || selectedSkill !== 'all' || selectedTag || showPinnedOnly) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedSkill('all');
                setSelectedTag('');
                setShowPinnedOnly(false);
              }}
              className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Notes List Grouped by Date */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-6 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="h-24 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg text-neutral-500 text-sm">
          No notes found. Add a new note.
        </div>
      ) : (
        <div className="space-y-6">
          {groupedNotes.map((group) => (
            <div key={group.date} className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatReadableDate(group.date)}</span>
                <span className="text-[10px] font-normal text-neutral-400">
                  ({group.notes.length} {group.notes.length === 1 ? 'note' : 'notes'})
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.notes.map((note) => (
                  <div
                    key={note._id}
                    className={`p-4 rounded-lg border transition-all flex flex-col justify-between ${
                      note.pinned
                        ? 'border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/20 dark:bg-indigo-950/20'
                        : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                    }`}
                  >
                    <div>
                      {/* Note Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                            {note.skill}
                          </span>
                          <span className="text-xs text-neutral-400">{note.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleTogglePin(note)}
                            className={`p-1 rounded text-neutral-400 hover:text-indigo-600 transition-colors ${
                              note.pinned ? 'text-indigo-600 dark:text-indigo-400' : ''
                            }`}
                            aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                          >
                            <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(note)}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                            aria-label="Edit note"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteModal({
                                isOpen: true,
                                noteId: note._id,
                                noteTitle: note.title || note.body.slice(0, 25),
                              })
                            }
                            className="p-1 rounded text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                            aria-label="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {note.title && (
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1.5">
                          {note.title}
                        </h3>
                      )}

                      <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                        {note.body}
                      </p>
                    </div>

                    {/* Note Tags */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        {note.tags.map((t) => (
                          <span
                            key={t}
                            onClick={() => setSelectedTag(t.toLowerCase())}
                            className="cursor-pointer px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-indigo-600"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Note Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800 mb-4">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {editingNoteId ? 'Edit Note' : 'Add Note'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Skill
                  </label>
                  <select
                    value={formSkill}
                    onChange={(e) => setFormSkill(e.target.value as SkillCategory)}
                    className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="general">General</option>
                    <option value="grammar">Grammar</option>
                    <option value="speaking">Speaking</option>
                    <option value="listening">Listening</option>
                    <option value="reading">Reading</option>
                    <option value="writing">Writing</option>
                    <option value="vocab">Vocab</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Describe Image template structure"
                  className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-medium text-neutral-700 dark:text-neutral-300">
                    Body (max 1000 chars)
                  </label>
                  <span className="text-[10px] text-neutral-400">
                    {formBody.length}/1000
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value.slice(0, 1000))}
                  placeholder="Write your study notes..."
                  required
                  className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 resize-none"
                />
              </div>

              {/* Tags Input */}
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Tags
                </label>
                <div className="flex flex-wrap items-center gap-1.5 p-2 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                  {formTags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-[11px]"
                    >
                      <span>#{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="text-neutral-400 hover:text-neutral-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Add tag and press Enter..."
                    className="flex-1 min-w-[120px] bg-transparent focus:outline-hidden text-xs py-0.5"
                  />
                </div>
              </div>

              {/* Pinned Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formPinned}
                  onChange={(e) => setFormPinned(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                />
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  Pin this note to the top
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNote || !formBody.trim()}
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50"
                >
                  {savingNote ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Note"
        message={`Delete the note "${deleteModal.noteTitle}"?`}
        confirmText="Delete"
        isDestructive={true}
        onConfirm={confirmDeleteNote}
        onCancel={() => setDeleteModal({ isOpen: false, noteId: '', noteTitle: '' })}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Loader2 } from "lucide-react";

export const Notes = () => {
  const [notes] = api.note.getAll.useSuspenseQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "date">("title");

  const utils = api.useUtils();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const createNote = api.note.create.useMutation({
    onSuccess: async () => {
      await utils.note.invalidate();
      setTitle("");
      setContent("");
    },
  });

  const editNote = api.note.edit.useMutation({
    onMutate: async (updatedNote) => {
      await utils.note.getAll.cancel();

      const previousNotes = utils.note.getAll.getData();

      utils.note.getAll.setData(undefined, (oldNotes) =>
        oldNotes?.map((note) => (note.id === updatedNote.id ? { ...note, ...updatedNote } : note)) ?? []
      );

      return { previousNotes };
    },
    onError: (_err, _updatedNote, context) => {
      if (context?.previousNotes) {
        utils.note.getAll.setData(undefined, context.previousNotes);
      }
    },
    onSuccess: () => {
      setEditingId(null);
    },
  });

  const deleteNote = api.note.delete.useMutation({
    onMutate: ({ id }) => {
      setDeletingId(id);
    },
    onSuccess: async () => {
      setDeletingId(null);
      await utils.note.invalidate();
    },
    onError: async () => {
      setDeletingId(null);
    }
  });

  const filteredNotes = notes?.filter(
    (note) =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedNotes = filteredNotes?.sort((a, b) => {
    if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Create Note Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createNote.mutate({ title, content });
        }}
        className="bg-gray-900 p-4 rounded-lg shadow-md space-y-4"
      >
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg px-4 py-2 text-black"
        />
        <textarea
          placeholder="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-lg px-4 py-2 text-black"
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold transition hover:bg-blue-700 flex justify-center items-center"
          disabled={createNote.isPending}
        >
          {createNote.isPending ? <Loader2 className="animate-spin" /> : "Submit"}
        </button>
      </form>
      {/* Search and Sort Inputs */}
      <div className="bg-gray-900 p-4 rounded-lg shadow-md space-y-4">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search Notes"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg px-4 py-2 text-black"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "title" | "date")}
            className="rounded-lg px-4 py-2 text-black"
          >
            <option value="title">Sort by Title</option>
            <option value="date">Sort by Date</option>
          </select>
        </div>
      </div>
      {/* Notes */}
      <div className="space-y-4">
        {sortedNotes?.map((note) => (
          <div key={note.id} className="bg-gray-900 p-4 rounded-lg shadow-md space-y-2">
            {editingId === note.id ? (
              <>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-black"
                />
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-black"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="w-full rounded-lg bg-gray-600 px-4 py-2 font-semibold transition hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => editNote.mutate({ id: note.id, title: editedTitle, content: editedContent })}
                    className="w-full rounded-lg bg-green-600 px-4 py-2 font-semibold transition hover:bg-green-700 flex justify-center items-center"
                  >
                    {editNote.isPending ? <Loader2 className="animate-spin" /> : "Save"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold">{note.title}</h3>
                <p>{note.content}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(note.id);
                      setEditedTitle(note.title);
                      setEditedContent(note.content);
                    }}
                    className="rounded-lg bg-yellow-600 px-4 py-2 font-semibold transition hover:bg-yellow-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteNote.mutate({ id: note.id })}
                    className="rounded-lg bg-red-600 px-4 py-2 font-semibold transition hover:bg-red-700 flex justify-center items-center"
                  >
                    {deletingId === note.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "Delete"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
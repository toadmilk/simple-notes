"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { Input } from "~/components/ui/input";

type NewNote = {
  title: string;
  content: string;
};

export const Notes = () => {
  const utils = api.useUtils();
  const [notes] = api.note.getAll.useSuspenseQuery();
  const generateContentMutation = api.note.generateContent.useMutation();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "date">("title");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  let tempIdCounter = -1;

  const createNote = api.note.create.useMutation({
    onMutate: async (newNote: NewNote) => {
      await utils.note.getAll.cancel();
      const previousNotes = utils.note.getAll.getData();

      const tempId = tempIdCounter--;

      utils.note.getAll.setData(undefined, (oldNotes) => [
        ...(oldNotes ?? []),
        {
          ...newNote,
          id: tempId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      return { previousNotes, tempId };
    },
    onSuccess: (data, _variables, context) => {
      utils.note.getAll.setData(undefined, (oldNotes) =>
        oldNotes?.map((note) =>
          note.id === context?.tempId ? { ...data } : note,
        ),
      );
    },
    onError: (_err, _newNote, context) => {
      if (context?.previousNotes) {
        utils.note.getAll.setData(undefined, context.previousNotes);
      }
    },
  });

  const editNote = api.note.edit.useMutation({
    onMutate: async (updatedNote) => {
      await utils.note.getAll.cancel();

      const previousNotes = utils.note.getAll.getData();

      utils.note.getAll.setData(
        undefined,
        (oldNotes) =>
          oldNotes?.map((note) =>
            note.id === updatedNote.id ? { ...note, ...updatedNote } : note,
          ) ?? [],
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
    },
  });

  const filteredNotes = notes?.filter(
    (note) =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const sortedNotes = filteredNotes?.sort((a, b) => {
    if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const shouldGrayOut = (noteId: number) => {
    // If the note has a negative ID, it's a temporary note
    return noteId < 0 || deletingId === noteId;
  };

  const handleAIGenerateContent = async (newNote: NewNote) => {
    setAiLoading(true);
    const result = await generateContentMutation.mutateAsync({ newNote });
    setAiSuggestion(result?.content ?? "");
    setAiLoading(false);
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="w-full text-sm opacity-50">Title</div>
          <Input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg px-4 py-2"
          />
          {!aiSuggestion ? (
            <>
              <div className="w-full text-sm opacity-50">Content</div>
              <Textarea
                placeholder="Content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full rounded-lg px-4 py-2"
              />
              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="w-full"
                  onClick={() => createNote.mutate({ title, content })}
                  disabled={
                    createNote.isPending || !title.trim() || !content.trim()
                  }
                >
                  {createNote.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "Create Note"
                  )}
                </Button>
                <Button
                  onClick={() => handleAIGenerateContent({ title, content })}
                  disabled={
                    !title.trim() || !content.trim() || createNote.isPending
                  }
                >
                  {aiLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Sparkles />
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-full text-sm opacity-50">Original</div>
              <Textarea
                value={content}
                className="w-full rounded-lg px-4 py-2"
                disabled={true}
              />
              <div className="w-full text-sm opacity-50">AI Suggestion</div>
              <Textarea
                value={aiSuggestion}
                onChange={(e) => setAiSuggestion(e.target.value)}
                className="w-full rounded-lg px-4 py-2"
              />
              <div className="flex gap-4">
                <Button
                  onClick={() => setAiSuggestion(null)}
                  className="w-full"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setContent(aiSuggestion);
                    setAiSuggestion(null);
                  }}
                  className="w-full"
                >
                  Accept
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex justify-between gap-2 p-4">
          <Input
            type="text"
            placeholder="Search Notes"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg px-4 py-2"
          />
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as "title" | "date")}
          >
            <SelectTrigger className="h-full">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Sort by Title</SelectItem>
              <SelectItem value="date">Sort by Date</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {sortedNotes?.map((note) => (
        <Card
          key={note.id}
          className={shouldGrayOut(note.id) ? "opacity-50" : ""}
        >
          <CardHeader>
            <CardTitle>
              {editingId === note.id ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full"
                />
              ) : (
                note.title
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editingId === note.id ? (
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full"
              />
            ) : (
              <div className="prose dark:prose-invert">
                <ReactMarkdown
                  rehypePlugins={[rehypeRaw]}
                  remarkPlugins={[remarkGfm]}
                >
                  {note.content}
                </ReactMarkdown>
              </div>
            )}
            <div className="mt-2 flex gap-2">
              {editingId === note.id ? (
                <>
                  <Button
                    onClick={() => setEditingId(null)}
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      editNote.mutate({
                        id: note.id,
                        title: editedTitle,
                        content: editedContent,
                      })
                    }
                  >
                    {editNote.isPending ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => {
                      setEditingId(note.id);
                      setEditedTitle(note.title);
                      setEditedContent(note.content);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => deleteNote.mutate({ id: note.id })}
                    className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                  >
                    {deletingId === note.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "Delete"
                    )}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
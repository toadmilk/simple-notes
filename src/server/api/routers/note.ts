import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const noteRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ title: z.string().min(1), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.note.create({
        data: {
          title: input.title,
          content: input.content,
        },
      });
    }),

  edit: publicProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.note.update({
        where: { id: input.id },
        data: {
          title: input.title,
          content: input.content,
        },
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.note.delete({
        where: { id: input.id },
      });
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.note.findMany();
  }),

  generateContent: publicProcedure
    .input(z.object({
      newNote: z.object({
        title: z.string().min(1),
        content: z.string().min(1),
      })
    }))
    .mutation(async ({ ctx, input }) => {
      const completion = await openai.chat.completions.create({
        model: "openai/gpt-4",
        messages: [
          {
            role: "user",
            content: `Finish/improve the content for a note with the title "${input.newNote.title}" and the following content: "${input.newNote.content}".
            If unclear try to guess what the user would like to add to the note. Response should be the direct content, do not write the title or any other information.
            Also please return in markdown format if possible.`,
          },
        ],
      });

      const generatedContent = completion.choices[0]?.message?.content;

      if (!generatedContent) {
        return;
      }

      return { content: generatedContent };
    }),
});
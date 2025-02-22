import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

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
    .input(z.object({ id: z.number(), title: z.string().min(1), content: z.string().min(1) }))
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

  getAll: publicProcedure
    .query(async ({ ctx }) => {
      return ctx.db.note.findMany();
    }),
});
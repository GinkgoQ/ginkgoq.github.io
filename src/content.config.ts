import { defineCollection, z } from "astro:content";

const postSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.date(),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  image: z.string().optional(),
  draft: z.boolean().default(false),
});

const blog = defineCollection({
  schema: postSchema,
});

const research = defineCollection({
  schema: postSchema,
});

const speechline = defineCollection({
  schema: postSchema,
});

const engineering = defineCollection({
  schema: postSchema,
});

const healthcarePharma = defineCollection({
  schema: postSchema,
});

export const collections = {
  blog,
  research,
  speechline,
  engineering,
  "healthcare-pharma": healthcarePharma,
};

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// One YAML file per publication in src/content/publications/. The file name
// is the id used by <ProjectPubs ids={[...]} />.
// Author names omit their final period; the renderers add it.
const publications = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/publications" }),
  schema: z
    .object({
      type: z.enum(["article", "chapter", "dataset"]).default("article"),
      authors: z.array(z.string()).min(1),
      /** May contain <i> for taxon names. */
      title: z.string(),
      year: z.number().int().optional(),
      status: z.enum(["Submitted", "In review", "Accepted", "In revision", "In prep"]).optional(),
      /** Journal; for a chapter the book line, for a dataset the publisher. */
      journal: z.string().optional(),
      volume: z.string().optional(),
      issue: z.string().optional(),
      /** Page range or article number. */
      pages: z.string().optional(),
      /** Published version: bare DOI or doi.org URL. */
      doi: z.string().optional(),
      /** Article page when there is no DOI. */
      url: z.url().optional(),
      /** Preprint: bare DOI or URL. */
      preprint: z.string().optional(),
      pdf: z.url().optional(),
      /** The PDF link asks for a copy instead of downloading. */
      pdfRequest: z.boolean().default(false),
      github: z.url().optional(),
      website: z.url().optional(),
    })
    .strict()
    .refine((p) => (p.year === undefined) !== (p.status === undefined), {
      message: "Set exactly one of `year` or `status`.",
    }),
});

export const collections = { publications };

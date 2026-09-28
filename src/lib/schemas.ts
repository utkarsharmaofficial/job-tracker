import { z } from "zod";
import { EMPLOYMENT_MODELS, STATUSES, TECH_AREAS, WORKPLACE_MODELS } from "./types";

const optText = z.string().trim().max(500).nullable().optional();

export const ApplicationPatchSchema = z.object({
  company: z.string().trim().min(1).max(200).optional(),
  role: optText,
  platform: optText,
  status: z.enum(STATUSES).optional(),
  statusLocked: z.boolean().optional(),
  appliedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  techArea: z.enum(TECH_AREAS).nullable().optional(),
  employmentModel: z.enum(EMPLOYMENT_MODELS).nullable().optional(),
  workplaceModel: z.enum(WORKPLACE_MODELS).nullable().optional(),
  location: optText,
  jobUrl: optText,
  notes: z.string().max(5000).nullable().optional(),
});

export const NewApplicationSchema = ApplicationPatchSchema.extend({
  company: z.string().trim().min(1).max(200),
  appliedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const uuidSchema = z.string().uuid();

export const profileUpdateSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  emailContact: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  location: z.string().max(255).optional(),
  timezone: z.string().max(50).optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  targetRoles: z.array(z.object({
    title: z.string(),
    fit: z.enum(['primary', 'secondary', 'adjacent']),
  })).optional(),
  compensation: z.object({
    currency: z.string().default('USD'),
    min: z.number().optional(),
    max: z.number().optional(),
    minimum: z.number().optional(),
    flexibility: z.string().optional(),
  }).optional(),
  narrative: z.object({
    headline: z.string().optional(),
    exitStory: z.string().optional(),
    superpowers: z.array(z.string()).optional(),
    proofPoints: z.array(z.string()).optional(),
  }).optional(),
  locationPrefs: z.object({
    remote: z.boolean().optional(),
    hybrid: z.boolean().optional(),
    onsite: z.boolean().optional(),
    cities: z.array(z.string()).optional(),
    countries: z.array(z.string()).optional(),
  }).optional(),
  archetypes: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
  })).optional(),
  customConfig: z.record(z.unknown()).optional(),
});

export const orgUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

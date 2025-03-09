import '@/zod2gql/zod2gql';
import { z } from 'zod';

export const RoleSchema = z.enum(['user', 'system', 'assistant', 'function']);

export const TeamSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  encryptionKey: z.string(),
  token: z.string().optional().nullable(),
  trainingData: z.string().optional().nullable(),
  agentName: z.string().optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional().nullable(),
  teamId: z.union([z.string().uuid(), z.null()]).optional(),
  primary: z.boolean().optional(),
  roleId: z.number().int().positive().optional(),
  agents: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      teamId: z.string().uuid(),
      default: z.boolean(),
      status: z.union([z.boolean(), z.literal(null)]),
    }),
  ),
  extensions: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional().nullable(),
      }),
    )
    .optional(),
});

export const UserTeamSchema = z.object({
  id: z.string(),
  userId: z.string(),
  teamId: z.string(),
  roleId: z.number().int(),
  enabled: z.boolean(),
  createdAt: z.string().datetime(),
});

export type Team = z.infer<typeof TeamSchema>;
export type User = z.infer<typeof UserSchema>;
export type UserTeam = z.infer<typeof UserTeamSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().optional().nullable(),
  displayName: z.string().optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  mfaCount: z.number().int(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  imageUrl: z.string().optional().nullable(),
  teams: z.array(UserTeamSchema).optional(),
});

export const NotificationSchema = z.object({
  conversationId: z.string(),
  conversationName: z.string(),
  message: z.string(),
  messageId: z.string(),
  timestamp: z.string().datetime(),
  role: z.string(),
});

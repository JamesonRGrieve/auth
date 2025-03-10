import '@/zod2gql/zod2gql';
import { z } from 'zod';

export const RoleSchema = z.enum(['user', 'system', 'assistant', 'function']);

// Define AgentSchema first to avoid circular references
export const AgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  //teamId: z.string().uuid().nullable().optional(), // Make teamId nullable as per backend schema
  // Remove default and status fields that aren't in the API
  // default: z.boolean(),
  // status: z.union([z.boolean(), z.literal(null)]),
});

// Create a simplified UserSchema for nested references
const SimpleUserSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.string().email(),
});

// Define TeamSchema for nested references
const SimpleTeamSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  agents: z.array(AgentSchema),
  userTeams: z.array(
    z.lazy(() =>
      z.object({
        id: z.string(),
        user: SimpleUserSchema,
        roleId: z.number().int(),
        enabled: z.boolean(),
        createdAt: z.string(),
      }),
    ),
  ),
});

// Update UserTeamSchema to include relations
export const UserTeamSchema = z.object({
  id: z.string(),
  userId: z.string(),
  teamId: z.string(),
  roleId: z.number().int(),
  enabled: z.boolean(),
  createdAt: z.string(),
  // Add nested team reference
  team: SimpleTeamSchema,
});

export const TeamSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  encryptionKey: z.string(),
  token: z.string().optional().nullable(),
  trainingData: z.string().optional().nullable(),
  agentName: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().optional().nullable(),
  teamId: z.union([z.string().uuid(), z.null()]).optional(),
  primary: z.boolean().optional(),
  roleId: z.number().int().positive().optional(),
  agents: z.array(AgentSchema),
  userTeams: z.array(UserTeamSchema).optional(),
  // extensions: z
  //   .array(
  //     z.object({
  //       id: z.string(),
  //       name: z.string(),
  //       description: z.string().optional().nullable(),
  //     }),
  //   )
  //   .optional(),
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
  createdAt: z.string(),
  imageUrl: z.string().optional().nullable(),
  // Rename to userTeams to match the desired output
  userTeams: z.array(UserTeamSchema).optional(),
  // Add agents to the user schema
  agents: z.array(AgentSchema).optional(),
});

export const NotificationSchema = z.object({
  conversationId: z.string(),
  conversationName: z.string(),
  message: z.string(),
  messageId: z.string(),
  timestamp: z.string(),
  role: z.string(),
});
const InviteeSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  isAccepted: z.boolean(),
  acceptedAt: z.string().datetime().nullable(),
  invitationId: z.string().uuid(),
  inviteeUser: SimpleUserSchema.nullable(),
});

export const InvitationSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  code: z.string().nullable(),
  roleId: z.number(),
  inviterId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().nullable(),
  createdByUser: z.string().nullable(),
  updatedByUser: z.string().nullable(),
  team: SimpleTeamSchema.nullable(),
  inviter: SimpleUserSchema.nullable(),
  invitees: z.array(InviteeSchema).optional(),
});

export type Invitation = z.infer<typeof InvitationSchema>;

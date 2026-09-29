// SPDX-License-Identifier: AGPL-3.0-or-later
import { z } from 'zod';

export const RoleSchema = z.enum(['user', 'system', 'assistant', 'function']);

// Define AgentSchema first to avoid circular references
export const AgentSchema = z
  .object({
    id: z.guid(),
    name: z.string().min(1),
    //teamId: z.guid().nullable().optional(), // Make teamId nullable as per backend schema
    // Remove default and status fields that aren't in the API
    // default: z.boolean(),
    // status: z.union([z.boolean(), z.literal(null)]),
  })
  .describe('Agent');

// Create a simplified UserSchema for nested references
const SimpleUserSchema = z
  .object({
    id: z.guid(),
    firstName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),
    email: z.email(),
  })
  .describe('User');

// Define TeamSchema for nested references
const _SimpleTeamSchema = z
  .object({
    id: z.guid(),
    name: z.string().min(1),
    agents: z.array(AgentSchema),
    userTeams: z.array(
      z.lazy(() =>
        z.object({
          id: z.string(),
          user: SimpleUserSchema,
          roleId: z.string(),
          enabled: z.boolean(),
          createdAt: z.string(),
        }),
      ),
    ),
  })
  .describe('Team');

// Update UserTeamSchema to include relations
export const UserTeamSchema = z
  .object({
    id: z.string(),
    // userId: z.string(),
    // teamId: z.string(),
    // roleId: z.string(),
    // createdAt: z.string(),
    // team: SimpleTeamSchema,
  })
  .describe('UserTeam');

export const TeamSchema = z
  .object({
    id: z.guid(),
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    // encryptionKey: z.string(),
    // token: z.string().optional().nullable(),
    // trainingData: z.string().optional().nullable(),
    // agentName: z.string().optional().nullable(),
    createdAt: z.string(),
    updatedAt: z.string().optional().nullable(),
    parentId: z.union([z.guid(), z.null()]).optional(),
    // primary: z.boolean().optional(),
    // roleId: z.number().int().positive().optional(),
    // agents: z.array(AgentSchema),
    // userTeams: z.array(UserTeamSchema).optional(),
    // extensions: z
    //   .array(
    //     z.object({
    //       id: z.string(),
    //       name: z.string(),
    //       description: z.string().optional().nullable(),
    //     }),
    //   )
    //   .optional(),
  })
  .describe('Team');

export type Team = z.infer<typeof TeamSchema>;
export type User = z.infer<typeof UserSchema>;
export type UserTeam = z.infer<typeof UserTeamSchema>;

export const UserSchema = z
  .object({
    id: z.guid(),
    email: z.email(),
    username: z.string().optional().nullable(),
    displayName: z.string().optional().nullable(),
    firstName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),
    //mfaCount: z.number().int(),
    active: z.boolean(),
    createdAt: z.string(),
    imageUrl: z.string().optional().nullable(),
    // Rename to userTeams to match the desired output
    //userTeams: z.array(UserTeamSchema).optional(),
    // Add agents to the user schema
    //agents: z.array(AgentSchema).optional(),
  })
  .describe('User');

export const NotificationSchema = z
  .object({
    conversationId: z.string(),
    conversationName: z.string(),
    message: z.string(),
    messageId: z.string(),
    createdAt: z.string(),
    role: z.string(),
  })
  .describe('Notification');
const _InviteeSchema = z
  .object({
    id: z.guid(),
    email: z.email(),
    isAccepted: z.boolean(),
    acceptedAt: z.iso.datetime().nullable(),
    invitationId: z.guid(),
    inviteeUser: SimpleUserSchema.nullable(),
  })
  .describe('Invitee');

export const InvitationSchema = z
  .object({
    id: z.guid(),
    teamId: z.guid(),
    code: z.string().nullable(),
    roleId: z.string().nullable(),
    // inviterId: z.guid(),
    createdAt: z.string(),
    updatedAt: z.string().nullable(),
    createdByUserId: z.string().nullable(),
    // updatedByUser: z.string().nullable(),
    // team: TeamSchema.nullable(),
    user: UserSchema.nullable(),
    //role: RoleSchema.nullable(),
    userId: z.string().nullable(),
    // inviter: SimpleUserSchema.nullable(),
    // invitees: z.array(InviteeSchema).optional(),
  })
  .describe('Invitations');

export type Invitation = z.infer<typeof InvitationSchema>;

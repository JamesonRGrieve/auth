// SPDX-License-Identifier: AGPL-3.0-or-later
import { z } from 'zod';

// The signed-in user and their teams are read over GraphQL; zod2gql builds each query's field
// selection from these schemas, so a field here is a field asked for. The names are the server's
// UserType and TeamType fields. The server declares every field nullable; id, email and a team's
// name stay required because a record without them can't be shown or acted on, so one fails to
// parse rather than rendering blank.

export const UserSchema = z
  .object({
    id: z.guid(),
    email: z.email(),
    username: z.string().nullish(),
    displayName: z.string().nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    active: z.boolean().nullish(),
    createdAt: z.string().nullish(),
    imageUrl: z.string().nullish(),
  })
  .describe('User');
export type User = z.infer<typeof UserSchema>;

export const TeamSchema = z
  .object({
    id: z.guid(),
    name: z.string().min(1),
    description: z.string().nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish(),
    parentId: z.guid().nullish(),
  })
  .describe('Team');
export type Team = z.infer<typeof TeamSchema>;

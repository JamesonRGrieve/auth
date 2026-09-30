// SPDX-License-Identifier: AGPL-3.0-or-later
// Device pairing (auth_device_pairing): a new device shows a QR code carrying a one-time token; a
// signed-in device opens it (<authPath>/pair/approve?token=…) and approves or denies the sign-in.
import { z } from 'zod';
import { authRequest } from '../lib/api';

export const PAIRING_ENDPOINT = '/v1/auth/pairing';

const PairingAnswerSchema = z.object({ pairing_id: z.string(), state: z.enum(['approved', 'denied']) });
export type PairingAnswer = z.infer<typeof PairingAnswerSchema>;

export type PairingDecision = 'approve' | 'deny';

/** Approve or deny the pairing `token` names, as the signed-in user. */
export async function answerPairing(authServer: string, token: string, decision: PairingDecision): Promise<PairingAnswer> {
  return authRequest(`${authServer}${PAIRING_ENDPOINT}/${decision}`, PairingAnswerSchema, {
    method: 'POST',
    body: { token },
  });
}

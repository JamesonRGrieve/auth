'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import Field from '@jgrieve/forms/Field';
import { Button } from '@jgrieve/forms/components/ui/button';
import axios from 'axios';
import { deleteCookie, getCookie } from 'cookies-next';
import { type ReactElement, useEffect, useState } from 'react';
import { LuCircleCheck as LuCheckCircle, LuKey } from 'react-icons/lu';
import { QRCode } from 'react-qr-code';
import log from '../lib/log';

function cookieString(value: ReturnType<typeof getCookie>): string {
  return typeof value === 'string' ? value : '';
}

export type RegisterFormProps = object;
export default function VerifyAuthenticator({
  verifiedCallback,
}: {
  verifiedCallback: (verified: boolean) => void;
}): ReactElement {
  const [fields, setFields] = useState({
    token: '',
  });
  const [platformLink, setPlatformLink] = useState('');
  const [errors, setErrors] = useState({
    token: '',
  });
  const [totpVerified, setTotpVerified] = useState(false);
  const totpUri = cookieString(getCookie('totpUri'));

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iphone/i.test(ua) || /ipod/i.test(ua)) {
      setPlatformLink('https://apps.apple.com/us/app/google-authenticator/id388497605');
    }
    if (/android/i.test(ua)) {
      setPlatformLink('https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2');
    }
  }, []);
  async function attemptTotp(): Promise<void> {
    try {
      const response = await axios.post<{ detail: string }>(`/api/mfa`, {
        email: getCookie('email'),
        mfa_token: fields.token,
      });
      const totpResponse = response.data.detail;
      log(['TOTP Response', totpResponse], { client: 2 });

      if (totpResponse.toLowerCase() === 'true') {
        verifiedCallback(true);
        setTotpVerified(true);
        void deleteCookie('totpUri');
      } else {
        log([`TOTP verification of ${cookieString(getCookie('email'))} failed.`], { client: 2 });
        setErrors({
          ...errors,
          token: 'TOTP verification failed.',
        });
      }
    } catch (error: unknown) {
      console.error('Error verifying TOTP:', error);
      setErrors({
        ...errors,
        token: 'Error during TOTP verification.',
      });
    }
  }

  return (
    <>
      <div>
        <h5 className='py-2 text-center'>Authenticator App Verification</h5>
        {!totpVerified && (
          <>
            <p className='py-2'>
              Please add the following QR code to your authenticator app of choice and enter the code below. If you
              don&quot;t have one, we recommend{' '}
              {platformLink ? <a href={platformLink}>Google Authenticator</a> : 'Google Authenticator'}.
            </p>
            <div className='w-full h-auto mx-auto my-0 max-w-64'>
              <QRCode
                size={256}
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                value={totpUri}
                viewBox={`0 0 256 256`}
              />
            </div>
          </>
        )}
      </div>
      <div className='flex flex-col items-center'>
        {totpVerified ? (
          <LuCheckCircle className='w-20 h-20' />
        ) : (
          <>
            <Field
              nameID='totp-input'
              label='MFA Code'
              //autoComplete='one-time-code'
              value={fields.token}
              onChange={(e) => setFields({ ...fields, token: (e.target as HTMLInputElement).value })}
              //submit={null}
              //error={errors.token}
            />
            <Button variant='outline' className='space-x-1 bg-transparent' onClick={() => void attemptTotp()}>
              <LuKey className='w-5 h-5' />
              <span>Verify MFA</span>
            </Button>
          </>
        )}
      </div>
    </>
  );
}

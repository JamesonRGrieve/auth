'use client';

import { Button } from '@/components/ui/button';
import Field from '@/components/ui/styled/FormControl/Field';
import { useToast } from '@/hooks/useToast';
import log from '@/next-log/log';
import axios from 'axios';
import { getCookie } from 'cookies-next';
import { CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { LuKey } from 'react-icons/lu';

export type RegisterFormProps = object;

export default function VerifyEmail({ verifiedCallback }: { verifiedCallback: any }): JSX.Element {
  const { toast } = useToast();
  const [fields, setFields] = useState({
    emailCode: '',
  });
  const [errors, setErrors] = useState({
    emailCode: '',
  });
  const [emailVerified, setEmailVerified] = useState(false);

  async function attemptEmail() {
    const emailResponse = (
      await axios.post(
        `/api/email`,
        {
          email: getCookie('email'),
          mfa_token: fields.emailCode,
        },
        {},
      )
    ).data.detail;

    log(['E-Mail Response', emailResponse], { client: 2 });

    if (emailResponse.toLowerCase() === 'true') {
      verifiedCallback(true);
      setEmailVerified(true);
      toast({
        title: 'Email Verified',
        description: 'Your email has been successfully verified.',
      });
    } else {
      log(['Email verification failed', getCookie('email')], { client: 2 });
      setErrors({
        ...errors,
        emailCode: 'Email verification failed.',
      });
      toast({
        title: 'Verification Failed',
        description: 'The verification code is incorrect. Please try again.',
        variant: 'destructive',
      });
    }
  }

  return (
    <>
      <div>
        <h5 className='py-4 text-2xl text-center'>Email Verification</h5>
        {!emailVerified && (
          <div className='py-2'>An email with a code was sent to {getCookie('email')}. Please enter the code below.</div>
        )}
      </div>

      <div className='flex flex-col items-center'>
        {emailVerified ? (
          <CheckCircle className='w-20 h-20' />
        ) : (
          <>
            <Field
              nameID='email-code-input'
              label='EMail Code'
              //autoComplete='email-code'
              value={fields.emailCode}
              onChange={(e: any) => setFields({ ...fields, emailCode: e.target.value })}
              //submit={null}
              //error={errors.emailCode}
            />
            <Button variant='outline' className='space-x-1 bg-transparent' onClick={attemptEmail}>
              <LuKey className='w-5 h-5' />
              <span>Verify Email</span>
            </Button>
          </>
        )}
      </div>
    </>
  );
}

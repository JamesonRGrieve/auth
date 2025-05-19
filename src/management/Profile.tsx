'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import DynamicForm from '@/dynamic-form/DynamicForm';
import log from '@/next-log/log';
import axios from 'axios';
import { deleteCookie, getCookie } from 'cookies-next';
import { mutate } from 'swr';
import VerifySMS from '../mfa/SMS';

export const Profile = ({
  isLoading,
  error,
  data,
  router,
  authConfig,
  userDataSWRKey,
  responseMessage,
  userUpdateEndpoint,
  setResponseMessage,
}: {
  isLoading: boolean;
  error: any;
  data: any;
  router: any;
  authConfig: any;
  userDataSWRKey: string;
  responseMessage: string;
  userUpdateEndpoint: string;
  setResponseMessage: (message: string) => void;
}) => {
  return (
    <div>
      <div>
        <h3 className='text-lg font-medium'>Profile</h3>
        <p className='text-sm text-muted-foreground'>Apply basic changes to your profile</p>
      </div>
      <Separator className='my-4' />
      {isLoading ? (
        <p>Loading Current Data...</p>
      ) : error ? (
        <p>{error.message}</p>
      ) : (data.missing_requirements && Object.keys(data.missing_requirements).length === 0) ||
        !data.missing_requirements ? (
        <DynamicForm
          fields={{
            first_name: {
              type: 'text',
              display: 'First Name',
              validation: (value: string) => value.length > 0,
              value: data.user?.first_name
            },
            last_name: {
              type: 'text',
              display: 'Last Name',
              validation: (value: string) => value.length > 0,
              value: data.user?.last_name
            },
            display_name: {
              type: 'text',
              display: 'Display Name',
              validation: (value: string) => value.length > 0,
              value: data.user?.display_name
            },
            timezone: {
              type: 'text',
              display: 'Timezone',
              validation: (value: string) => value.length > 0,
              value: data.user?.timezone
            },
          }}
          toUpdate={data.user}
          submitButtonText='Update'
          excludeFields={[
            'id',
            'agent_id',
            'missing_requirements',
            'email',
            'subscription',
            'stripe_id',
            'ip_address',
            'companies',
          ]}
          readOnlyFields={['input_tokens', 'output_tokens']}
          // additionalButtons={[
          //   <Button key='done' className='col-span-2' onClick={() => router.push('/chat')}>
          //     Go to {authConfig.appName}
          //   </Button>,
          // ]}
          onConfirm={async (data) => {
            const updateResponse = (
              await axios
                .put(
                  `${authConfig.authServer}${userUpdateEndpoint}`,
                  {
                    user: {
                    ...Object.entries(data).reduce((acc, [key, value]) => {
                      return value ? { ...acc, [key]: value } : acc;
                    }, {}),
                  },
                  },
                  {
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${getCookie('jwt')}`,
                    },
              })
                .catch((exception: any) => exception.response)
            ).data;
            log(['Update Response', updateResponse], { client: 2 });
            setResponseMessage(updateResponse.detail.toString());
            await mutate('/user');
          }}
        />
      ) : (
        <>
          {data.missing_requirements.some((obj) => Object.keys(obj).some((key) => key === 'verify_email')) && (
            <p className='text-xl'>Please check your email and verify it using the link provided.</p>
          )}
          {data.missing_requirements.verify_sms && <VerifySMS verifiedCallback={async () => await mutate(userDataSWRKey)} />}
          {data.missing_requirements.some((obj) =>
            Object.keys(obj).some((key) => !['verify_email', 'verify_sms'].includes(key)),
          ) && (
            <DynamicForm
              submitButtonText='Submit Missing Information'
              fields={Object.entries(data.missing_requirements).reduce((acc, [key, value]) => {
                // @ts-expect-error This is a valid assignment.
                acc[Object.keys(value)[0]] = { type: Object.values(value)[0] };
                return acc;
              }, {})}
              excludeFields={['verify_email', 'verify_sms']}
              onConfirm={async (data) => {
                const updateResponse = (
                  await axios
                    .put(
                      `${authConfig.authServer}${userUpdateEndpoint}`,
                      {
                        ...data,
                      },
                      {
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: getCookie('jwt'),
                        },
                      },
                    )
                    .catch((exception: any) => exception.response)
                ).data;
                if (updateResponse.detail) {
                  setResponseMessage(updateResponse.detail.toString());
                }
                await mutate(userDataSWRKey);
                if (data.missing_requirements && Object.keys(data.missing_requirements).length === 0) {
                  const redirect = getCookie('href') ?? '/';
                  deleteCookie('href');
                  router.push(redirect);
                }
              }}
            />
          )}
          {responseMessage && <p>{responseMessage}</p>}
        </>
      )}
    </div>
  );
};

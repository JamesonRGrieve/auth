'use client';
import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import axios from 'axios';
import { getCookie } from 'cookies-next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useCompanies, useInvitations } from '@/components/interactive/hooks';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LuTrash2 } from 'react-icons/lu';
import { useAuthentication } from '../Router';
const ROLES = [
  { id: 2, name: 'Admin' },
  { id: 3, name: 'User' },
];

// Only show for super admin (0), owner (1), or admin (2)
const AUTHORIZED_ROLES = [0, 1, 2];

export const Companies = ({ data, setResponseMessage }: { data: any; setResponseMessage: (message: string) => void }) => {
  const { data: invitations } = useInvitations(getCookie('agixt-company-id'));
  console.log('Invitations', invitations);
  const { data: companies } = useCompanies();
  console.log('Companies', companies);
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState<string>('3'); // Default to User role
  // TODO: Add a selector to choose a company to invite to if the user has multiple companies
  /* 
  Commented to avoid potential breakage from assumptions.
  Check if user has permission to invite.
  Will need to make sure we're getting the role from the right place before re-enabling this.
  
  if (!data?.role || !AUTHORIZED_ROLES.includes(data.role)) {
    return null;
  }
  */
  const authConfig = useAuthentication();
  console.log(data);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setResponseMessage('Please enter an email to invite.');
      return;
    }
    try {
      const response = await axios.post(
        `${authConfig.authServer}/v1/invitations`,
        {
          email: email,
          role_id: parseInt(roleId),
          company_id: getCookie('agixt-company-id'),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: getCookie('jwt'),
          },
        },
      );

      if (response.status === 200) {
        if (response.data?.id) {
          setResponseMessage(
            `Invitation sent successfully! The invite link is ${process.env.NEXT_PUBLIC_APP_URI}/?invitation_id=${response.data.id}&email=${email}`,
          );
        } else {
          setResponseMessage('Invitation sent successfully!');
        }
        setEmail('');
      }
    } catch (error: any) {
      setResponseMessage(error.response?.data?.detail || 'Failed to send invitation');
    }
  };

  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-medium'>Invitations</h3>
        <p className='text-sm text-muted-foreground'>Invite new users to join your organization</p>
      </div>

      <Separator />

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='email'>Email Address</Label>
          <Input
            id='email'
            type='email'
            placeholder='user@example.com'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className='w-full'
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='role'>Role</Label>
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Select a role' />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role.id} value={role.id.toString()}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type='submit' className='w-full' disabled={!email}>
          Send Invitation
        </Button>
      </form>

      <Separator />

      <div>
        <h3 className='my-4'>Pending Invitations</h3>
        <ul className='flex flex-col gap-4'>
          {invitations?.map((x) => (
            <li key={x.id} className='flex gap-4 items-center'>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    size='icon'
                    onClick={() => {
                      axios.delete(`${process.env.NEXT_PUBLIC_AGIXT_SERVER}/v1/invitation/${x.id}`, {
                        headers: {
                          Authorization: getCookie('jwt'),
                        },
                      });
                    }}
                  >
                    <LuTrash2 className='w-4 h-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cancel Invitation</TooltipContent>
              </Tooltip>
              {x.email} ({x.role_id <= 2 ? 'Admin' : 'User'}) sent at {new Date(x.created_at).toLocaleString()} by{' '}
              {x.inviter_id}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import axios from 'axios';
import { getCookie, setCookie } from 'cookies-next';
import { useEffect, useState } from 'react';
import { LuCheck, LuPencil, LuPlus } from 'react-icons/lu';
import { useTeam, useTeams } from '../hooks/useTeam';

const ROLES = [
  { id: 2, name: 'Admin' },
  { id: 3, name: 'User' },
];

const AUTHORIZED_ROLES = [0, 1, 2];

export const Team = () => {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('3');
  const [renaming, setRenaming] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newParent, setNewParent] = useState('');
  const [newName, setNewName] = useState('');
  const { data: teamData } = useTeams();
  console.log('ALL TEAMS', teamData);
  const { data: activeTeam, mutate } = useTeam();
  const [responseMessage, setResponseMessage] = useState('');
  console.log(activeTeam);
  const handleConfirm = async () => {
    if (renaming) {
      try {
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_URI}/v1/teams/${activeTeam?.id}`,
          { name: newName },
          {
            headers: {
              Authorization: getCookie('jwt'),
              'Content-Type': 'application/json',
            },
          },
        );
        setRenaming(false);
        mutate();
        setResponseMessage('Team name updated successfully!');
      } catch (error) {
        setResponseMessage(error.response?.data?.detail || 'Failed to update team name');
      }
    } else {
      try {
        const newResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URI}/v1/teams`,
          { name: newName, agent_name: newName + ' Agent', ...(newParent ? { parent_company_id: newParent } : {}) },
          {
            headers: {
              Authorization: getCookie('jwt'),
              'Content-Type': 'application/json',
            },
          },
        );
        mutate();
        setResponseMessage('Team created successfully!');
      } catch (error) {
        setResponseMessage(error.response?.data?.detail || 'Failed to create team');
      }
      setCreating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setResponseMessage('Please enter an email to invite.');
      return;
    }
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URI}/v1/invitations`,
        {
          email: email,
          role_id: parseInt(roleId),
          team_id: teamData?.id,
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
    } catch (error) {
      setResponseMessage(error.response?.data?.detail || 'Failed to send invitation');
    }
  };
  const [selectedTeam, setSelectedTeam] = useState('');
  useEffect(() => {
    setSelectedTeam(getCookie('auth-team'));
  }, [getCookie('auth-team')]);
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-start'>
        {renaming || creating ? (
          <>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className='w-64'
              placeholder='Enter new name'
            />
            {creating && (
              <Select value={newParent} onValueChange={(value) => setNewParent(value)}>
                <SelectTrigger className='w-64'>
                  <SelectValue placeholder='(Optional) Select a Parent Team' />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Parent Team</SelectLabel>
                    <SelectItem value='-'>[NONE]</SelectItem>
                    {teamData?.map((child: any) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </>
        ) : (
          <Select
            value={selectedTeam}
            onValueChange={(value) => {
              setCookie('auth-team', value, {
                domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
              });
              mutate();
            }}
          >
            <SelectTrigger className='w-64'>
              <SelectValue placeholder='Select a Team' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {teamData?.map((team: any) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}

        <TooltipProvider>
          <div className='flex gap-2'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    if (renaming) {
                      handleConfirm();
                    } else {
                      setRenaming(true);
                      setNewName(activeTeam?.name);
                    }
                  }}
                  disabled={creating}
                  size='icon'
                  variant='ghost'
                >
                  {renaming ? <LuCheck className='h-4 w-4' /> : <LuPencil className='h-4 w-4' />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{renaming ? 'Confirm rename' : 'Rename'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    if (creating) {
                      handleConfirm();
                    } else {
                      setCreating(true);
                      setNewName('');
                    }
                  }}
                  disabled={renaming}
                  size='icon'
                  variant='ghost'
                >
                  {creating ? <LuCheck className='h-4 w-4' /> : <LuPlus className='h-4 w-4' />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{creating ? 'Confirm create' : 'Create new'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default Team;

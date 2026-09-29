'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from '@jgrieve/forms/components/ui/button';
import { Input } from '@jgrieve/forms/components/ui/input';
import { Label } from '@jgrieve/forms/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@jgrieve/forms/components/ui/select';
import { useToast } from '@jgrieve/forms/hooks/useToast';
import axios from 'axios';
import { getCookie, setCookie } from 'cookies-next';
import { useParams, useRouter } from 'next/navigation.js';
import { useCallback, useEffect, useState } from 'react';
import { LuPencil, LuPlus } from 'react-icons/lu';
import useSWR from 'swr';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../components/ui/sidebar';
import { useInvitations } from '../hooks/useInvitation';
import { SYSTEM_TEAM_ID, useTeam } from '../hooks/useTeam';
import { cookieDomainOptions } from '../utils';
import { InviteDialog } from './Invite';

type TeamWithExtras = {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  agents?: Array<{ id: string; name: string }>;
};

type ApiError = { response?: { data?: { detail?: string } } };

const readJwtString = (): string => {
  const jwt = getCookie('jwt');
  return typeof jwt === 'string' ? jwt : '';
};

const apiUri = (): string => process.env.NEXT_PUBLIC_API_URI ?? '';

const SelectTeam = ({
  selectedTeam,
  userTeams,
  selectNewTeam,
}: {
  selectedTeam: TeamWithExtras | null;
  userTeams: TeamWithExtras[];
  selectNewTeam: (team: TeamWithExtras) => void;
}): React.JSX.Element => {
  const hasTeams = userTeams.length > 0;
  return (
    <>
      <SidebarGroupLabel>Select Team</SidebarGroupLabel>
      <div className='w-full group-data-[collapsible=icon]:hidden'>
        <Select
          value={selectedTeam === null ? '' : selectedTeam.id}
          onValueChange={(value: string) => {
            const team = userTeams.find((t) => t.id === value);
            if (team !== undefined) {
              selectNewTeam(team);
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={hasTeams ? 'Select a Team' : 'None - Create a team'} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {hasTeams ? (
                userTeams.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value='SYSTEM' disabled>
                  No teams available
                </SelectItem>
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </>
  );
};

export const RenameDialog = ({
  newName,
  setNewName,
  checkTeamNameExists,
  onTeamRenamed,
  disabled,
}: {
  newName: string;
  setNewName: (name: string) => void;
  checkTeamNameExists: (name: string) => boolean;
  onTeamRenamed?: (newTeamName: string) => void;
  disabled?: boolean;
}): React.JSX.Element => {
  const { toast } = useToast() as { toast: (args: { title: string; description: string; variant?: string }) => void };
  const { data: activeTeam, mutate } = useTeam() as {
    data?: { id?: string; name?: string };
    mutate: () => Promise<unknown>;
  };
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);

  const handleConfirmRename = async (): Promise<void> => {
    if (checkTeamNameExists(newName)) {
      toast({
        title: 'Error',
        description: 'Team name already exists. Please choose a different name.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await axios.put(
        `${apiUri()}/v1/team/${activeTeam?.id ?? ''}`,
        { team: { name: newName } },
        {
          headers: {
            'Authorization': `Bearer ${readJwtString()}`,
            'Content-Type': 'application/json',
          },
        },
      );
      setIsRenameDialogOpen(false);
      void mutate();
      toast({
        title: 'Success',
        description: 'Team name updated successfully!',
      });
      if (onTeamRenamed !== undefined) {
        onTeamRenamed(newName);
      }
    } catch (error: unknown) {
      const err = error as ApiError;
      toast({
        title: 'Error',
        description: err.response?.data?.detail ?? 'Failed to update team name',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => {
            setNewName(activeTeam?.name ?? '');
            setIsRenameDialogOpen(true);
          }}
          tooltip='Rename Team'
          disabled={disabled}
        >
          <LuPencil className='w-4 h-4' />
          <span>Rename Team</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Team</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <Input
              value={newName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
              placeholder='Enter new name'
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleConfirmRename();
              }}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const CreateDialog = ({
  newName,
  setNewName,
  teamData,
  checkTeamNameExists,
  onTeamCreated,
}: {
  newName: string;
  setNewName: (name: string) => void;
  teamData: TeamWithExtras[];
  checkTeamNameExists: (name: string) => boolean;
  onTeamCreated: (newTeamId?: string) => void;
}): React.JSX.Element => {
  const { toast } = useToast() as { toast: (args: { title: string; description: string; variant?: string }) => void };
  const { mutate } = useTeam() as { mutate: () => Promise<unknown> };
  const [newParent, setNewParent] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);

  const handleConfirmCreate = async (e?: React.SyntheticEvent): Promise<void> => {
    if (e !== undefined) {
      e.preventDefault();
    }
    if (newName.trim() === '') {
      toast({
        title: 'Error',
        description: 'Team name is required.',
        variant: 'destructive',
      });
      return;
    }
    if (checkTeamNameExists(newName) && !isDuplicate) {
      setIsDuplicate(true);
      return;
    }
    try {
      const response = await axios.post<{ team?: { id?: string } }>(
        `${apiUri()}/v1/team`,
        {
          name: newName,
          agent_name: `${newName} Agent`,
          ...(newParent !== '' ? { parent_company_id: newParent } : {}),
        },
        {
          headers: {
            'Authorization': `Bearer ${readJwtString()}`,
            'Content-Type': 'application/json',
          },
        },
      );
      void mutate();
      setIsCreateDialogOpen(false);
      setIsDuplicate(false);
      toast({
        title: 'Success',
        description: 'Team created successfully!',
      });
      onTeamCreated(response.data.team?.id);
    } catch (error: unknown) {
      const err = error as ApiError;
      toast({
        title: 'Error',
        description: err.response?.data?.detail ?? 'Failed to create team',
        variant: 'destructive',
      });
    }
  };

  const handleTeamName = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setNewName(e.target.value.slice(0, 20));
    if (isDuplicate) {
      setIsDuplicate(false);
    }
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => {
            setNewName('');
            setNewParent('');
            setIsDuplicate(false);
            setIsCreateDialogOpen(true);
          }}
          tooltip='Create Team'
        >
          <LuPlus className='w-4 h-4' />
          <span>Create Team</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e: React.SyntheticEvent) => void handleConfirmCreate(e)}>
            <div className='grid gap-4 py-4'>
              <Input
                value={newName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTeamName(e)}
                required
                placeholder='Enter team name (max 20 chars)'
                maxLength={20}
                name='teamName'
              />
              <Select value={newParent} onValueChange={(value: string) => setNewParent(value)}>
                <SelectTrigger>
                  <SelectValue placeholder='(Optional) Select a Parent Team' />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Parent Team</SelectLabel>
                    <SelectItem value='-'>[NONE]</SelectItem>
                    {teamData.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {isDuplicate && (
              <div className='text-xs text-yellow-700 bg-yellow-100 rounded px-2 py-2 mb-2'>
                <Label>
                  You are already a member of a team with this name, creating another may cause confusion, are you sure you
                  want to continue?
                </Label>
              </div>
            )}
            <DialogFooter>
              <Button
                variant='outline'
                type='button'
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setIsDuplicate(false);
                }}
              >
                Cancel
              </Button>
              <Button type='submit'>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const Team = (): React.JSX.Element => {
  const [newName, setNewName] = useState('');
  const [userTeams, setUserTeams] = useState<TeamWithExtras[]>([]);
  const [selectedTeam, setSelected] = useState<TeamWithExtras | null>(null);
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const rawAuthTeam = id ?? getCookie('auth-team');
  const authTeam = typeof rawAuthTeam === 'string' ? rawAuthTeam : Array.isArray(rawAuthTeam) ? (rawAuthTeam[0] ?? '') : '';

  const { data: activeTeam, mutate: _mutate } = useTeam() as { data?: { parentId?: string | null }; mutate: () => void };
  const { mutate: inviteMutate } = useInvitations(authTeam) as { mutate: () => Promise<unknown> };
  const userDataEndpoint = '/v1/user';
  const userDataSWRKey = '/user';

  type UserDataResponse = { user?: { id?: string } } & Record<string, unknown>;
  const {
    data,
    error: _error,
    isLoading: _isLoading,
  } = useSWR<UserDataResponse, Error, string>(userDataSWRKey, async () => {
    const response = await axios.get<UserDataResponse>(`${apiUri()}${userDataEndpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${readJwtString()}`,
      },
      validateStatus: (status) => [200, 403].includes(status),
    });
    return response.data;
  });

  const getUserTeams = useCallback(async (): Promise<{ teams: TeamWithExtras[] } & Record<string, unknown>> => {
    const response = await axios.get<{ teams?: TeamWithExtras[] } & Record<string, unknown>>(`${apiUri()}/v1/team`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${readJwtString()}`,
      },
      validateStatus: (status) => [200, 403].includes(status),
    });
    const filteredTeams = response.data.teams ? response.data.teams.filter((team) => team.id !== SYSTEM_TEAM_ID) : [];
    return { ...response.data, teams: filteredTeams };
  }, []);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      const userTeamData = await getUserTeams();
      if (userTeamData.teams.length > 0) {
        setUserTeams(userTeamData.teams);
        const selectedTeamMatch = userTeamData.teams.find((c) => c.id === authTeam);
        setSelected(selectedTeamMatch ?? null);
      }
    };

    if (data?.user?.id !== undefined) {
      void fetchData();
    }
  }, [data, getUserTeams, authTeam]);

  const selectNewTeam = (teamObj: TeamWithExtras): void => {
    if (teamObj.id !== '') {
      void setCookie('auth-team', teamObj.id, cookieDomainOptions());
      setSelected(teamObj);
      router.push(`/team/${teamObj.id}`);
      void inviteMutate();
    }
  };

  const checkTeamNameExists = (name: string): boolean => {
    return userTeams.some((team) => team.name.toLowerCase() === name.toLowerCase());
  };

  return (
    <SidebarContent title='Team Management'>
      {selectedTeam !== null && (
        <SidebarGroup>
          <SidebarGroupLabel>{selectedTeam.name}</SidebarGroupLabel>
          <div className='space-y-2 px-2'>
            {selectedTeam.description !== null && selectedTeam.description !== undefined && (
              <div className='text-sm text-muted-foreground'>
                <span className='font-medium'>Description:</span> {selectedTeam.description}
              </div>
            )}
            {activeTeam?.parentId !== null && activeTeam?.parentId !== undefined && (
              <div className='text-sm text-muted-foreground'>
                <span className='font-medium'>Parent Team ID:</span> {selectedTeam.parentId}
              </div>
            )}
            {selectedTeam.agents !== undefined && selectedTeam.agents.length > 0 && (
              <div className='text-sm text-muted-foreground'>
                <span className='font-medium'>Agents:</span>
                <ul className='list-disc list-inside mt-1'>
                  {selectedTeam.agents.map((agent: { id: string; name: string }) => (
                    <li key={agent.id}>{agent.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </SidebarGroup>
      )}
      <SidebarGroup>
        <SelectTeam selectedTeam={selectedTeam} userTeams={userTeams} selectNewTeam={selectNewTeam} />
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>Team Functions</SidebarGroupLabel>
        <SidebarMenu>
          <RenameDialog
            newName={newName}
            setNewName={setNewName}
            checkTeamNameExists={checkTeamNameExists}
            onTeamRenamed={(_newTeamName: string) => {
              void (async (): Promise<void> => {
                const teamData = await getUserTeams();
                if (teamData.teams.length > 0) {
                  setUserTeams(teamData.teams);
                  if (selectedTeam?.id !== undefined) {
                    const renamedTeam = teamData.teams.find((t) => t.id === selectedTeam.id);
                    if (renamedTeam !== undefined) {
                      setSelected(renamedTeam);
                    }
                  }
                }
              })();
            }}
            disabled={selectedTeam === null}
          />

          <CreateDialog
            newName={newName}
            setNewName={setNewName}
            teamData={userTeams}
            checkTeamNameExists={checkTeamNameExists}
            onTeamCreated={(newTeamId?: string) => {
              void (async (): Promise<void> => {
                const teamData = await getUserTeams();
                if (teamData.teams.length > 0) {
                  setUserTeams(teamData.teams);
                  if (newTeamId !== undefined && newTeamId !== '') {
                    const createdTeam = teamData.teams.find((t) => t.id === newTeamId);
                    if (createdTeam !== undefined) {
                      selectNewTeam(createdTeam);
                    }
                  }
                }
              })();
            }}
          />

          <InviteDialog selectedTeam={selectedTeam} />
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  );
};

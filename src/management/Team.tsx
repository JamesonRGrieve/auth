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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import axios from 'axios';
import { getCookie, setCookie } from 'cookies-next';
import { useEffect, useState } from 'react';
import { LuPencil, LuPlus } from 'react-icons/lu';
import { SYSTEM_TEAM_ID, useTeam } from '../hooks/useTeam';
import { useToast } from '@/hooks/useToast';
import { ArrowBigLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { DynamicFormFieldValueTypes } from '@/dynamic-form/DynamicForm';
import { InviteDialog } from './Invite';
import { useInvitations } from '../hooks/useInvitation';
import { Team } from '../hooks/z';
import { Label } from '../../../ui/label';

type User = {
  missing_requirements?: {
    [key: string]: {
      type: 'number' | 'boolean' | 'text' | 'password';
      value: DynamicFormFieldValueTypes;
      validation?: (value: DynamicFormFieldValueTypes) => boolean;
    };
  };
};

export const Team = () => {
  const [newName, setNewName] = useState('');
  const [userTeams, setUserTeams] = useState([]);
  const [selectedTeam, setSelected] = useState<any | null>(null);
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const authTeam = id ? id : getCookie('auth-team');

  const { data: activeTeam, mutate } = useTeam();
  const { mutate: inviteMutate } = useInvitations(String(authTeam));
  const userDataEndpoint = '/v1/user';
  const userDataSWRKey = '/user';

  const { data, error, isLoading } = useSWR<User, any, string>(userDataSWRKey, async () => {
    return (
      await axios.get(`${process.env.NEXT_PUBLIC_API_URI}${userDataEndpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getCookie('jwt')}`,
        },
        validateStatus: (status) => [200, 403].includes(status),
      })
    ).data;
  });

  const getUserTeams = async () => {
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/v1/team`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getCookie('jwt')}`,
      },
      validateStatus: (status) => [200, 403].includes(status),
    });
    const filteredTeams = response.data?.teams ? response.data.teams.filter((team: Team) => team.id !== SYSTEM_TEAM_ID) : [];
    return { ...response.data, teams: filteredTeams };
  };

  useEffect(() => {
    const fetchData = async () => {
      const data = await getUserTeams();
      if (data && data?.teams?.length) {
        setUserTeams(data.teams);
        const selecetdTeam = data.teams.find((c: { id: string }) => c.id === authTeam);
        setSelected(selecetdTeam);
      }
    };

    if (data?.user?.id) {
      fetchData();
    }
  }, [data]);

  const selectNewTeam = (teamObj: { id: string }) => {
    if (teamObj?.id) {
      setCookie('auth-team', teamObj.id, { domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN });
      setSelected(teamObj);
      router.push(`/team/${teamObj.id}`);
      inviteMutate();
    }
  };

  const checkTeamNameExists = (name: string) => {
    return userTeams.some((team: any) => team.name.toLowerCase() === name.toLowerCase());
  };

  return (
    <SidebarContent title='Team Management'>
      {selectedTeam && (
        <SidebarGroup>
          <SidebarGroupLabel>{selectedTeam?.name}</SidebarGroupLabel>
          <div className='space-y-2 px-2'>
            {selectedTeam?.description && (
              <div className='text-sm text-muted-foreground'>
                <span className='font-medium'>Description:</span> {selectedTeam.description}
              </div>
            )}
            {activeTeam?.parentId && (
              <div className='text-sm text-muted-foreground'>
                <span className='font-medium'>Parent Team ID:</span> {selectedTeam.parentId}
              </div>
            )}
            {selectedTeam?.agents && selectedTeam.agents.length > 0 && (
              <div className='text-sm text-muted-foreground'>
                <span className='font-medium'>Agents:</span>
                <ul className='list-disc list-inside mt-1'>
                  {selectedTeam.agents.map((agent) => (
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
            onTeamRenamed={async (newTeamName: string) => {
              const data = await getUserTeams();
              if (data && data?.teams?.length) {
                setUserTeams(data.teams);
                // Find the renamed team and set as selected
                if (selectedTeam && selectedTeam.id) {
                  const renamedTeam = data.teams.find((t: any) => t.id === selectedTeam.id);
                  if (renamedTeam) setSelected(renamedTeam);
                }
              }
            }}
            disabled={!selectedTeam}
          />

          <CreateDialog
            newName={newName}
            setNewName={setNewName}
            teamData={userTeams}
            checkTeamNameExists={checkTeamNameExists}
            onTeamCreated={async (newTeamId?: string) => {
              const data = await getUserTeams();
              if (data && data?.teams?.length) {
                setUserTeams(data.teams);
                // Set the newly created team as selected
                if (newTeamId) {
                  const createdTeam = data.teams.find((t: any) => t.id === newTeamId);
                  if (createdTeam) selectNewTeam(createdTeam);
                }
              }
            }}
          />

          <InviteDialog selectedTeam={selectedTeam} />
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  );
};

const SelectTeam = ({
  selectedTeam,
  userTeams,
  selectNewTeam,
}: {
  selectedTeam: any;
  userTeams: any;
  selectNewTeam: (team: any) => void;
}) => {
  const hasTeams = userTeams && userTeams.length > 0;
  return (
    <>
      <SidebarGroupLabel>Select Team</SidebarGroupLabel>
      {/* <SidebarMenuButton className='group-data-[state=expanded]:hidden'>
        <ArrowBigLeft />
      </SidebarMenuButton> */}
      <div className='w-full group-data-[collapsible=icon]:hidden'>
        <Select value={selectedTeam === null ? '' : selectedTeam} onValueChange={(value) => selectNewTeam(value)}>
          <SelectTrigger>
            <SelectValue placeholder={hasTeams ? 'Select a Team' : 'None - Create a team'} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {hasTeams ? (
                userTeams.map((child: any) => (
                  <SelectItem key={child.id} value={child}>
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
}) => {
  const { toast } = useToast();
  const { data: activeTeam, mutate } = useTeam();
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);

  const handleConfirmRename = async () => {
    if (checkTeamNameExists(newName)) {
      toast({
        title: 'Error',
        description: 'Team name already exists. Please choose a different name.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const jwt = getCookie('jwt') as string;
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URI}/v1/team/${activeTeam?.id}`,
        { team: { name: newName } },
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
        },
      );
      setIsRenameDialogOpen(false);
      mutate();
      toast({
        title: 'Success',
        description: 'Team name updated successfully!',
      });
      if (onTeamRenamed) onTeamRenamed(newName);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update team name',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => {
            setNewName(activeTeam?.name || '');
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
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder='Enter new name' />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRename}>Rename</Button>
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
  teamData: any[];
  checkTeamNameExists: (name: string) => boolean;
  onTeamCreated: (newTeamId?: string) => void;
}) => {
  const { toast } = useToast();
  const { mutate } = useTeam();
  const [newParent, setNewParent] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);

  const handleConfirmCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newName.trim()) {
      toast({
        title: 'Error',
        description: 'Team name is required.',
        variant: 'destructive',
      });
      return;
    }
    if (checkTeamNameExists(newName) && !isDuplicate) {
      setIsDuplicate(true);
      // toast({
      //   title: 'Error',
      //   description: 'Team name already exists. Please choose a different name.',
      //   variant: 'destructive',
      // });
      return;
    }
    try {
      const jwt = getCookie('jwt') as string;
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URI}/v1/team`,
        {
          name: newName,
          agent_name: newName + ' Agent',
          ...(newParent ? { parent_company_id: newParent } : {}),
        },
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
        },
      );
      mutate();
      setIsCreateDialogOpen(false);
      setIsDuplicate(false);
      toast({
        title: 'Success',
        description: 'Team created successfully!',
      });
      if (onTeamCreated) onTeamCreated(response.data?.team?.id);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to create team',
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
          <form onSubmit={handleConfirmCreate}>
            <div className='grid gap-4 py-4'>
              <Input
                value={newName}
                onChange={(e) => handleTeamName(e)}
                required
                placeholder='Enter team name (max 20 chars)'
                maxLength={20}
                name='teamName'
                autoFocus
              />
              <Select value={newParent} onValueChange={(value) => setNewParent(value)}>
                <SelectTrigger>
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

export default Team;

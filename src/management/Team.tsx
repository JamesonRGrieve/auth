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
import { LuCheck, LuPencil, LuPlus, LuUsers } from 'react-icons/lu';
import { useTeam, useTeams } from '../hooks/useTeam';
import { useToast } from '@/hooks/useToast';
import { ArrowBigLeft } from 'lucide-react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { DynamicFormFieldValueTypes } from '@/dynamic-form/DynamicForm';
const ROLES = [
  { id: 2, name: 'Admin' },
  { id: 3, name: 'User' },
];

const AUTHORIZED_ROLES = [0, 1, 2];

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
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('3');
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [newParent, setNewParent] = useState('');
  const [newName, setNewName] = useState('');
  const [userTeams, setUserTeams] = useState([]);
  const [selectedTeam, setSelected] = useState({});
  const { toast } = useToast();

  const params = useParams();
  const { id } = params;
  const authTeam = id ? id : getCookie('auth-team');

  const { data: teamData } = useTeams();
  const { data: activeTeam, mutate } = useTeam();
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
    return (
      await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/v1/team`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getCookie('jwt')}`,
        },
        validateStatus: (status) => [200, 403].includes(status),
      })
    ).data;
  };

  useEffect(() => {

  })

  useEffect(() => {
    const fetchData = async () => {
      const data = await getUserTeams();
      if (data && data?.teams?.length) {
        console.log(data);
        setUserTeams(data.teams);
        const selecetdTeam = data.teams.find((c: { id: string }) => c.id === authTeam);
        setSelected(selecetdTeam);
      }
    };
    if (data?.user?.id) {
      fetchData();
    }
  }, [data]);

  const selectNewTeam = (teamObj: { id: string}) => {
    if (teamObj?.id) {
      setCookie('auth-team', teamObj.id, { domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN });
      setSelected(teamObj);
    }
  }

  const handleConfirmRename = async () => {
    try {
      const jwt = getCookie('jwt') as string;
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URI}/v1/teams/${activeTeam?.id}`,
        { name: newName },
        {
          headers: {
            Authorization: jwt,
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
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update team name',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmCreate = async () => {
    try {
      const jwt = getCookie('jwt') as string;
      await axios.post(
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
      toast({
        title: 'Success',
        description: 'Team created successfully!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to create team',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: 'Error',
        description: 'Please enter an email to invite.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const jwt = getCookie('jwt') as string;
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URI}/v1/invitations`,
        {
          email: email,
          role_id: parseInt(roleId),
          team_id: teamData?.[0]?.id,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: jwt,
          },
        },
      );

      if (response.status === 200) {
        if (response.data?.id) {
          toast({
            title: 'Success',
            description: `Invitation sent successfully! The invite link is ${process.env.NEXT_PUBLIC_APP_URI}/?invitation_id=${response.data.id}&email=${email}`,
          });
        } else {
          toast({
            title: 'Success',
            description: 'Invitation sent successfully!',
          });
        }
        setEmail('');
        setIsInviteDialogOpen(false);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to send invitation',
        variant: 'destructive',
      });
    }
  };

  return (
    <SidebarContent title='Team Management'>
      {activeTeam && (
        <SidebarGroup>
          <SidebarGroupLabel>{activeTeam?.name}</SidebarGroupLabel>
          <div className='space-y-2 px-2'>
            {activeTeam?.description && (
              <div className='text-sm text-muted-foreground'>
                <span className='font-medium'>Description:</span> {activeTeam.description}
              </div>
            )}
            {activeTeam?.parentId && (
              <div className='text-sm text-muted-foreground'>
                <span className='font-medium'>Parent Team ID:</span> {activeTeam.parentId}
              </div>
            )}
            {activeTeam?.agents && activeTeam.agents.length > 0 && (
              <div className='text-sm text-muted-foreground'>
                <span className='font-medium'>Agents:</span>
                <ul className='list-disc list-inside mt-1'>
                  {activeTeam.agents.map((agent) => (
                    <li key={agent.id}>{agent.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </SidebarGroup>
      )}
      <SidebarGroup>
        <SidebarGroupLabel>Select Team</SidebarGroupLabel>
          <SidebarMenuButton className='group-data-[state=expanded]:hidden'>
            <ArrowBigLeft />
          </SidebarMenuButton>
          <div className='w-full group-data-[collapsible=icon]:hidden'>
            <Select value={selectedTeam} onValueChange={(value) => selectNewTeam(value)}>
              <SelectTrigger>
                <SelectValue placeholder='Select a Team' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {userTeams?.map((child: any) => (
                    <SelectItem key={child.id} value={child}>
                      {child.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        <SidebarGroupLabel>Team Functions</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                setNewName(activeTeam?.name || '');
                setIsRenameDialogOpen(true);
              }}
              tooltip='Rename Team'
            >
              <LuPencil className='w-4 h-4' />
              <span>Rename Team</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                setNewName('');
                setNewParent('');
                setIsCreateDialogOpen(true);
              }}
              tooltip='Create Team'
            >
              <LuPlus className='w-4 h-4' />
              <span>Create Team</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                setEmail('');
                setRoleId('3');
                setIsInviteDialogOpen(true);
              }}
              tooltip='Invite Member'
            >
              <LuUsers className='w-4 h-4' />
              <span>Invite Member</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

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

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder='Enter team name' />
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
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder='Enter email address' type='email' />
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder='Select role' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Role</SelectLabel>
                  {ROLES.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Send Invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarContent>
  );
};

export default Team;

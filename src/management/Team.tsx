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
  { id: 'FFFFFFFF-0000-0000-AAAA-FFFFFFFFFFFF', name: 'Admin' },
  { id: 'FFFFFFFF-0000-0000-0000-FFFFFFFFFFFF', name: 'User' },
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

interface Role {
  id: number;
  name: string;
  parent_id?: number;
  [key: string]: any;
}

interface RoleWithChildren extends Role {
  children: RoleWithChildren[];
  depth: number;
}

export const Team = () => {
  const [newName, setNewName] = useState('');
  const [userTeams, setUserTeams] = useState([]);
  const [selectedTeam, setSelected] = useState({});

  const params = useParams();
  const { id } = params;
  const authTeam = id ? id : getCookie('auth-team');

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

  const selectNewTeam = (teamObj: { id: string }) => {
    if (teamObj?.id) {
      setCookie('auth-team', teamObj.id, { domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN });
      setSelected(teamObj);
    }
  };

  const checkTeamNameExists = (name: string) => {
    return userTeams.some((team: any) => team.name.toLowerCase() === name.toLowerCase());
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
        <SelectTeam selectedTeam={selectedTeam} userTeams={userTeams} selectNewTeam={selectNewTeam} />
        <SidebarGroupLabel>Team Functions</SidebarGroupLabel>
        <SidebarMenu>
          <RenameDialog newName={newName} setNewName={setNewName} checkTeamNameExists={checkTeamNameExists} />

          <CreateDialog
            newName={newName}
            setNewName={setNewName}
            teamData={userTeams}
            checkTeamNameExists={checkTeamNameExists}
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
  return (
    <>
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
    </>
  );
};

export const RenameDialog = ({
  newName,
  setNewName,
  checkTeamNameExists,
}: {
  newName: string;
  setNewName: (name: string) => void;
  checkTeamNameExists: (name: string) => boolean;
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
}: {
  newName: string;
  setNewName: (name: string) => void;
  teamData: any[];
  checkTeamNameExists: (name: string) => boolean;
}) => {
  const { toast } = useToast();
  const { mutate } = useTeam();
  const [newParent, setNewParent] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleConfirmCreate = async () => {
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

  return (
    <>
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
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value.slice(0, 20))}
              required
              placeholder='Enter team name (max 20 chars)'
              maxLength={20}
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
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const InviteDialog = ({ selectedTeam }: { selectedTeam: any }) => {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(ROLES[1].id);
  const [roles, setRoles] = useState(ROLES);
  const { toast } = useToast();

  const fetchRoles = async () => {
    return (
      await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/v1/team/${selectedTeam.id}/role`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getCookie('jwt')}`,
        },
        validateStatus: (status) => [200, 403].includes(status),
      })
    ).data;
  };

  function sortRolesByPermission(roles: Role[]): Role[] {
    const roleMap = new Map<number, RoleWithChildren>();
    roles.forEach((role: Role) => {
      roleMap.set(role.id, { ...role, children: [], depth: -1 });
    });

    roleMap.forEach((role: RoleWithChildren) => {
      if (role.parent_id && roleMap.has(role.parent_id)) {
        roleMap.get(role.parent_id)!.children.push(role);
      }
    });

    function assignDepth(role: RoleWithChildren, depth: number): void {
      role.depth = depth;
      role.children.forEach((child: RoleWithChildren) => assignDepth(child, depth + 1));
    }

    roleMap.forEach((role: RoleWithChildren) => {
      if (!role.parent_id) {
        assignDepth(role, 0);
      }
    });

    const sortedRoles = Array.from(roleMap.values()).sort((a, b) => a.depth - b.depth);

    return sortedRoles.map(({ children, depth, ...role }) => role as Role);
  }

  useEffect(() => {
    if (selectedTeam) {
      fetchRoles()
        .then((data) => {
          const sortedRoles = sortRolesByPermission(data.roles);
          setRoles([...ROLES, ...sortedRoles]);
        })
        .catch(() => setRoles(ROLES));
    }
  }, [selectedTeam]);

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

    const emailArray = email.split(',').filter((emailStr) => emailStr.trim() !== '');
    if (emailArray.length === 0 || emailArray.length > 10) {
      toast({
        title: 'Error',
        description: emailArray.length === 0 ? 'Please enter an email to invite.' : 'You can only enter up to 10 emails.',
        variant: 'destructive',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const invalidEmails = emailArray.filter((email) => !emailRegex.test(email.trim()));

    if (invalidEmails.length > 0) {
      toast({
        title: 'Error',
        description: 'Invalid emails found: ' + invalidEmails.join(', '),
        variant: 'destructive',
      });
      return;
    }
    const body = {
      invitations: emailArray.map((email) => ({
        email: email.trim(),
        role_id: roleId,
        team_id: selectedTeam.id,
      })),
    };

    try {
      const jwt = getCookie('jwt') as string;
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/v1/invitation`, body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (response.status === 201) {
        toast({
          title: 'Success',
          description: 'Invitation sent successfully!',
        });
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
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => {
            setEmail('');
            setRoleId(ROLES[1].id);
            setIsInviteDialogOpen(true);
          }}
          tooltip='Invite Member'
        >
          <LuUsers className='w-4 h-4' />
          <span>Invite Member</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
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
                  {roles.map((role) => (
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
    </>
  );
};

export default Team;

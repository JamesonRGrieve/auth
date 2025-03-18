'use client';

import usePathname from '../../../auth/src/hooks/usePathname';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../../../components/ui/tooltip';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { useTeams } from '../hooks/useTeam';

export default function TeamSelector({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (value: string) => void;
}): React.JSX.Element {
  const { data: teams, error } = useTeams();
  const searchParams = useSearchParams();
  console.log('TEAM DATA', teams);
  const router = useRouter();
  const pathname = usePathname();
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>();

  useEffect(() => {
    console.log('TEAM DATA', teams);
  }, [teams]);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className='w-full'>
            <Select
              disabled={teams?.length === 0}
              value={value || selectedTeamId || undefined}
              onValueChange={(value: string) => {
                setSelectedTeamId(value);
              }}
            >
              <SelectTrigger className='w-full text-xs'>
                <SelectValue placeholder='Select a Team' />
              </SelectTrigger>
              <SelectContent>
                {!selectedTeamId && <SelectItem value='/'>- Use Default Team -</SelectItem>}
                {teams?.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Select a Team</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

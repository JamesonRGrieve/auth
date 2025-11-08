import {
  BookOpen,
  GraduationCap,
  HelpCircle,
  Puzzle,
  Rocket,
  Settings,
  User,
  Users,
  VenetianMask,
  Workflow,
  Server,
  RefreshCcw,
  ArrowRightLeft,
} from 'lucide-react';
import type { Item } from '@/app/NavMain';

export const items: Item[] = [
  {
    title: 'Connections',
    icon: ArrowRightLeft,
    items: [
      {
        title: 'Provider',
        url: '/provider',
        icon: Server,
      },
      {
        title: 'Rotation',
        url: '/rotation',
        icon: RefreshCcw,
      },
    ],
  },
  {
    title: 'Team Management',
    icon: Users,
    items: [
      {
        title: 'Team',
        icon: User,
        url: '/team',
      },
      {
        title: 'Team Training',
        icon: GraduationCap,
        url: '/settings/training',
        queryParams: {
          mode: 'company',
        },
      },
      {
        title: 'Team Extensions',
        icon: Puzzle,
        url: '/settings/extensions',
        queryParams: {
          tab: 'extensions',
          mode: 'company',
        },
      },
      {
        title: 'Team Abilities',
        icon: Workflow,
        url: '/settings/extensions',
        queryParams: {
          tab: 'abilities',
          mode: 'company',
        },
      },
      {
        title: 'Team Settings',
        icon: Settings,
        url: '/settings',
        queryParams: {
          mode: 'company',
        },
      },
    ],
  },
  {
    title: 'Documentation',
    icon: BookOpen,
    items: [
      {
        title: 'Getting Started',
        icon: Rocket,
        url: '/docs/getting-started',
      },
      {
        title: 'API Reference',
        icon: BookOpen,
        url: '/docs/api-reference',
      },
      {
        title: 'Support',
        icon: HelpCircle,
        url: '/docs/support',
      },
      {
        title: 'Privacy Policy',
        icon: VenetianMask,
        url: '/docs/privacy',
      },
    ],
  },
];

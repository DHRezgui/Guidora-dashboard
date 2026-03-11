import {
  LayoutDashboard,
  Users,
  Route,
  BarChart3,
  LogOut,
  Settings,
  UserCheck,
  ShieldCheck,
  Plus,
  Loader2,
  Search,
  Pencil,
  Trash2,
  Eye,
  Check,
  X,
  Mail,
  User,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  AlertTriangle,
  Building2,
  Copy,
  Key,
  Globe,
  type LucideProps,
} from 'lucide-react';

export const Icons = {
  logo: (props: LucideProps) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  spinner: Loader2,
  dashboard: LayoutDashboard,
  users: Users,
  tours: Route,
  analytics: BarChart3,
  logout: LogOut,
  settings: Settings,
  active: UserCheck,
  admin: ShieldCheck,
  plus: Plus,
  search: Search,
  edit: Pencil,
  trash: Trash2,
  eye: Eye,
  check: Check,
  close: X,
  mail: Mail,
  user: User,
  filter: Filter,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  more: MoreHorizontal,
  warning: AlertTriangle,
  building: Building2,
  copy: Copy,
  key: Key,
  globe: Globe,
};
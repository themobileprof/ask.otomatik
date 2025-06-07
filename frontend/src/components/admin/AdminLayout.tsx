import React from 'react';
import { useNavigate, Link, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calendar,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const AdminLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const menuItems = [
    {
      title: 'Dashboard',
      icon: Calendar,
      path: '/admin',
    },
    {
      title: 'Users',
      icon: Users,
      path: '/admin/users',
    },
    {
      title: 'Settings',
      icon: Settings,
      path: '/admin/settings',
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (!user || user.role !== 'admin') {
    return <Navigate to="/access-denied" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b h-16 fixed w-full z-50">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mr-4"
            >
              {sidebarOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
            <h1 className="text-xl font-semibold text-slate-900">
              Admin Dashboard
            </h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.picture} />
                  <AvatarFallback>
                    {user.name?.charAt(0) || user.email.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{user.name}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r transition-transform duration-200 ease-in-out z-40',
          !sidebarOpen && '-translate-x-full'
        )}
      >
        <div className="p-4">
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg',
                  'hover:bg-slate-100 hover:text-slate-900',
                  'transition-colors duration-200',
                  location.pathname === item.path
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          'pt-16 min-h-screen transition-all duration-200 ease-in-out',
          sidebarOpen ? 'pl-64' : 'pl-0'
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout; 
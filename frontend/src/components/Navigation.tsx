import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import UserMenu from './UserMenu';
import { scrollToSection } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const Navigation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    scrollToSection(sectionId);
    setIsMobileMenuOpen(false);
  };

  const menuItems = [
    { href: '/#services', label: 'Services' },
    { href: '/#booking', label: 'Book Now' },
    { href: '/#faq', label: 'FAQ' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/#hero" className="flex items-center space-x-2" onClick={(e) => handleAnchorClick(e, 'hero')}>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Otomatik
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-slate-600 hover:text-slate-900"
                onClick={(e) => handleAnchorClick(e, item.href.substring(2))}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="hidden md:flex items-center gap-2"
              >
                Dashboard
              </Button>
            )}
            <UserMenu />
            
            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-md hover:bg-slate-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-slate-600" />
              ) : (
                <Menu className="h-6 w-6 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200">
            <div className="flex flex-col space-y-4">
              {menuItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-slate-600 hover:text-slate-900 px-2 py-1"
                  onClick={(e) => handleAnchorClick(e, item.href.substring(2))}
                >
                  {item.label}
                </a>
              ))}
              {user && (
                <Button
                  variant="outline"
                  onClick={() => {
                    navigate('/dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full justify-center"
                >
                  Dashboard
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation; 
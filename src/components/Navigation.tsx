import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LoginArea } from '@/components/auth/LoginArea';
import { RelaySelector } from '@/components/RelaySelector';
import { Search } from '@/components/Search';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useTheme } from '@/hooks/useTheme';
import { Menu, Moon, Sun, Shield, Search as SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Get the base path from import.meta.env or default to '/'
const basePath = import.meta.env.BASE_URL || '/';

const navigationItems = [
  { name: 'News', href: '/blog', icon: `${basePath}News_button_1.svg` },
  { name: 'Artist', href: '/artist', icon: `${basePath}artist_button_1.svg` },
  { name: 'PopUp', href: '/popup', icon: `${basePath}PopUP_button_1.svg` },
  { name: 'Art', href: '/art', icon: `${basePath}Art_button_1.svg` },
  { name: 'Projects', href: '/projects', icon: `${basePath}projects_button_1.svg` },
  { name: 'Fundraising', href: '/fundraising', icon: `${basePath}fundrasing_button_1.svg` },
  { name: 'Shop', href: '/shop', icon: `${basePath}Shop_button_1.svg` },
];

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  // Check if current user is admin
  const isAdmin = useIsAdmin();

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <Link
            to="/"
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <img 
              src={`${basePath}B-Funny_avatar_orange.svg`}
              alt="BitPopArt Logo" 
              className="h-10 w-10"
            />
            <span className="font-bold text-xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              BitPopArt
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <img src={item.icon} alt={item.name} className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className={cn(
                  "flex items-center space-x-1 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                  isActive('/admin')
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Shield className="h-4 w-4" />
                <span>Admin</span>
              </Link>
            )}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchOpen(true)}
              className="h-9 w-9 p-0"
            >
              <SearchIcon className="h-4 w-4" />
            </Button>
            <RelaySelector className="max-w-40" />
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-9 w-9 p-0"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
            {isAdmin && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800 hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30"
              >
                <Link to="/admin" className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-purple-700 dark:text-purple-300 font-medium">Dashboard</span>
                </Link>
              </Button>
            )}
            <LoginArea className="max-w-48" />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col space-y-6 mt-6">
                  {/* Admin Dashboard Button (Mobile) */}
                  {isAdmin && (
                    <div className="px-4">
                      <Button
                        asChild
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                        onClick={() => setIsOpen(false)}
                      >
                        <Link to="/admin" className="flex items-center justify-center space-x-2">
                          <Shield className="h-5 w-5" />
                          <span className="font-medium">Admin Dashboard</span>
                        </Link>
                      </Button>
                    </div>
                  )}

                  {/* Mobile Navigation Links */}
                  <div className="space-y-2">
                    {navigationItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center space-x-3 px-4 py-3 rounded-full text-base font-medium transition-colors",
                          isActive(item.href)
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <img src={item.icon} alt={item.name} className="h-6 w-6" />
                        <span>{item.name}</span>
                      </Link>
                    ))}
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center space-x-3 px-4 py-3 rounded-full text-base font-medium transition-colors",
                          isActive('/admin')
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <Shield className="h-5 w-5" />
                        <span>Admin</span>
                      </Link>
                    )}
                  </div>

                  <div className="border-t pt-6 space-y-4 px-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setIsOpen(false);
                        setSearchOpen(true);
                      }}
                    >
                      <SearchIcon className="mr-2 h-4 w-4" />
                      Search
                    </Button>
                    <RelaySelector className="w-full" />
                    <LoginArea className="w-full" />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={toggleTheme}
                    >
                      {theme === 'light' ? (
                        <>
                          <Moon className="mr-2 h-4 w-4" />
                          Dark Mode
                        </>
                      ) : (
                        <>
                          <Sun className="mr-2 h-4 w-4" />
                          Light Mode
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Search Dialog */}
      <Search open={searchOpen} onOpenChange={setSearchOpen} />
    </nav>
  );
}
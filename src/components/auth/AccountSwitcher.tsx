import React, { useState } from 'react';
import { ChevronDown, LogOut, User, UserPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useNostrLogin } from '@nostrify/react/login';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { NSchema as n, NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import LoginDialog from './LoginDialog';
import SignupDialog from './SignupDialog';

interface Account {
  id: string;
  pubkey: string;
  event?: NostrEvent;
  metadata: NostrMetadata;
}

export function AccountSwitcher() {
  const { nostr } = useNostr();
  const { logins, setLogin, removeLogin } = useNostrLogin();

  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [signupDialogOpen, setSignupDialogOpen] = useState(false);

  const { data: authors = [] } = useQuery({
    queryKey: ['logins', logins.map((l) => l.id).join(';')],
    queryFn: async ({ signal }) => {
      let events: NostrEvent[] = [];

      try {
        events = await nostr.query(
          [{ kinds: [0], authors: logins.map((l) => l.pubkey) }],
          { signal: AbortSignal.any([signal, AbortSignal.timeout(500)]) },
        );
      } catch (error) {
        console.error('Error fetching accounts:', error);
        return [];
      }

      return logins.map(({ id, pubkey }): Account => {
        const event = events.find((e) => e.pubkey === pubkey);
        try {
          const metadata = n.json().pipe(n.metadata()).parse(event?.content);
          return { id, pubkey, metadata, event };
        } catch {
          return { id, pubkey, metadata: {}, event };
        }
      });
    }
  });

  const [_, ...otherUsers] = (authors || []) as [Account | undefined, ...Account[]];

  const handleLogin = () => {
    setLoginDialogOpen(false);
    setSignupDialogOpen(false);
  };

  const currentUser: Account | undefined = (() => {
    const login = logins[0];
    if (!login) return undefined;
    const author = authors.find((a) => a.id === login.id);
    return { metadata: {}, ...author, id: login.id, pubkey: login.pubkey };
  })();

  if (!currentUser) {
    return (
      <>
        <Button
          onClick={() => setLoginDialogOpen(true)}
          className='flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground w-full font-medium transition-all hover:bg-primary/90 animate-scale-in'
        >
          <User className='w-4 h-4' />
          <span>Log in</span>
        </Button>

        <LoginDialog
          isOpen={loginDialogOpen} 
          onClose={() => setLoginDialogOpen(false)} 
          onLogin={handleLogin}
          onSignup={() => setSignupDialogOpen(true)}
        />

        <SignupDialog
          isOpen={signupDialogOpen}
          onClose={() => setSignupDialogOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className='flex items-center gap-3 p-3 rounded-full hover:bg-accent transition-all w-full text-foreground'>
            <Avatar className='w-10 h-10'>
              <AvatarImage src={currentUser.metadata.picture} alt={currentUser.metadata.name} />
              <AvatarFallback>{currentUser.metadata.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className='flex-1 text-left hidden md:block'>
              <p className='font-medium text-sm'>{currentUser.metadata.name}</p>
            </div>
            <ChevronDown className='w-4 h-4 text-muted-foreground' />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56 p-2 animate-scale-in'>
          <div className='font-medium text-sm px-2 py-1.5'>Switch Account</div>
          {otherUsers.map((user) => (
            <DropdownMenuItem
              key={user.id}
              onClick={() => setLogin(user.id)}
              className='flex items-center gap-2 cursor-pointer p-2 rounded-md'
            >
              <Avatar className='w-8 h-8'>
                <AvatarImage src={user.metadata.picture} alt={user.metadata.name} />
                <AvatarFallback>{user.metadata.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className='flex-1'>
                <p className='text-sm font-medium'>{user.metadata.name}</p>
              </div>
              {user.id === currentUser.id && <div className='w-2 h-2 rounded-full bg-primary'></div>}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setLoginDialogOpen(true)}
            className='flex items-center gap-2 cursor-pointer p-2 rounded-md'
          >
            <UserPlus className='w-4 h-4' />
            <span>Add another account</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => removeLogin(currentUser.id)}
            className='flex items-center gap-2 cursor-pointer p-2 rounded-md text-red-500'
          >
            <LogOut className='w-4 h-4' />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LoginDialog
        isOpen={loginDialogOpen} 
        onClose={() => setLoginDialogOpen(false)} 
        onLogin={handleLogin}
        onSignup={() => setSignupDialogOpen(true)}
      />

      <SignupDialog
        isOpen={signupDialogOpen}
        onClose={() => setSignupDialogOpen(false)}
      />
    </>
  );
}
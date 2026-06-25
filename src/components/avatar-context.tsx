'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface UserContextValue {
  avatar: string | null;
  setAvatar: (url: string | null) => void;
  nickname: string;
  setNickname: (name: string) => void;
}

const UserContext = createContext<UserContextValue>({
  avatar: null,
  setAvatar: () => {},
  nickname: '',
  setNickname: () => {},
});

export function UserProvider({ initialAvatar, initialNickname, children }: { initialAvatar?: string; initialNickname?: string; children: ReactNode }) {
  const [avatar, setAvatar] = useState<string | null>(initialAvatar ?? null);
  const [nickname, setNickname] = useState(initialNickname ?? '');
  return (
    <UserContext.Provider value={{ avatar, setAvatar, nickname, setNickname }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

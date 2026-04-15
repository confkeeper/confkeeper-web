import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ServerInfoState {
    version: string;
    ldap: boolean;
    setServerInfo: (version: string, ldap: boolean) => void;
}

export const serverInfoStore = create<ServerInfoState>()(
    persist(
        (set) => ({
            version: '1.0.0',
            ldap: false,
            setServerInfo: (version, ldap) => set({version, ldap}),
        }),
        {
            name: 'serverInfo',
            partialize: (state) => ({version: state.version, ldap: state.ldap}),
        }
    )
);

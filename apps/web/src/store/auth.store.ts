import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserDto } from '@easypay/shared';

interface AuthState {
  user: UserDto | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (user: UserDto) => void;
  updateUser: (user: Partial<UserDto>) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (user) =>
        set({ user, isAuthenticated: true }),

      updateUser: (partial) =>
        set((state) => ({ user: state.user ? { ...state.user, ...partial } : null })),

      logout: () =>
        set({ user: null, isAuthenticated: false }),

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'finvault-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

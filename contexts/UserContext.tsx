import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

const STORAGE_KEY_USERS = 'fitlog_users_v1';
const STORAGE_KEY_CURRENT_USER = 'fitlog_current_user_v1';

export type FitLogUser = {
  id: string;
  name: string;
  createdAt: string;
};

type UserContextValue = {
  users: FitLogUser[];
  currentUser: FitLogUser | null;
  setCurrentUser: (userId: string) => void;
  clearCurrentUser: () => void;
  addUser: (name: string) => void;
  deleteUser: (userId: string) => void;
  isLoaded: boolean;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<FitLogUser[]>([]);
  const [currentUser, setCurrentUserState] = useState<FitLogUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersStored, currentUserIdStored] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_USERS),
          AsyncStorage.getItem(STORAGE_KEY_CURRENT_USER),
        ]);

        if (usersStored) {
          const parsedUsers = JSON.parse(usersStored);
          setUsers(parsedUsers);

          // Set current user if we have a stored ID
          if (currentUserIdStored) {
            const foundUser = parsedUsers.find((u: FitLogUser) => u.id === currentUserIdStored);
            if (foundUser) {
              setCurrentUserState(foundUser);
            }
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  // Save users to AsyncStorage whenever they change
  useEffect(() => {
    if (!isLoaded) return;

    const saveUsers = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
      } catch (error) {
        console.error('Error saving users:', error);
      }
    };
    saveUsers();
  }, [users, isLoaded]);

  // Save current user ID to AsyncStorage whenever it changes
  useEffect(() => {
    if (!isLoaded) return;

    const saveCurrentUser = async () => {
      try {
        if (currentUser) {
          await AsyncStorage.setItem(STORAGE_KEY_CURRENT_USER, currentUser.id);
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY_CURRENT_USER);
        }
      } catch (error) {
        console.error('Error saving current user:', error);
      }
    };
    saveCurrentUser();
  }, [currentUser, isLoaded]);

  const setCurrentUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUserState(user);
    }
  };

  const clearCurrentUser = () => {
    setCurrentUserState(null);
  };

  const addUser = (name: string) => {
    const newUser: FitLogUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };

    setUsers(prev => [...prev, newUser]);
    setCurrentUserState(newUser); // Automatically select the new user
  };

  // Delete user and their data
  const deleteUser = async (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    if (currentUser?.id === userId) {
      setCurrentUserState(null);
    }
    // Remove user-specific data keys
    const keysToRemove = [
      `fitlog_workouts_v1_user_${userId}`,
      `fitlog_meals_v1_user_${userId}`,
      `fitlog_user_profile_v1_user_${userId}`,
      `fitlog_program_days_v1_user_${userId}`,
      `fitlog_photo_days_v1_user_${userId}`,
    ];
    for (const key of keysToRemove) {
      await AsyncStorage.removeItem(key);
    }
  };

  return (
    <UserContext.Provider
      value={{
        users,
        currentUser,
        setCurrentUser,
        clearCurrentUser,
        addUser,
        deleteUser,
        isLoaded,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}

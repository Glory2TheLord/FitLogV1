// app/context/UserContext.tsx
// DEPRECATED: this file is no longer used.
// The real UserContext lives in `contexts/UserContext.tsx`.
// Do not import from this file.

export { };


    import AsyncStorage from '@react-native-async-storage/async-storage';
    import React, {
        createContext,
        useContext,
        useEffect,
        useMemo,
        useState
    } from 'react';

export type FitLogUser = {
	id: string;
	name: string;
	createdAt: string;
};

type UserContextValue = {
	users: FitLogUser[];
	currentUser: FitLogUser | null;
	setCurrentUser: (id: string | null) => void;
	addUser: (name: string) => void;
	deleteUser: (id: string) => void;
	loading: boolean;
};

type StoredState = {
	users: FitLogUser[];
	currentUserId: string | null;
};

const STORAGE_KEY = 'fitlog_users_v1';

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [users, setUsers] = useState<FitLogUser[]>([]);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		(async () => {
			try {
				const stored = await AsyncStorage.getItem(STORAGE_KEY);
				if (stored) {
					const parsed: StoredState = JSON.parse(stored);
					setUsers(parsed.users || []);
					setCurrentUserId(parsed.currentUserId || null);
				}
			} catch (e) {
				// ignore
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	useEffect(() => {
		if (loading) return;
		const state: StoredState = { users, currentUserId };
		AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	}, [users, currentUserId, loading]);

	const addUser = (name: string) => {
		const trimmed = name.trim();
		if (!trimmed) return;
		const newUser: FitLogUser = {
			id: 'user_' + Date.now(),
			name: trimmed,
			createdAt: new Date().toISOString(),
		};
		setUsers(prev => [...prev, newUser]);
		setCurrentUserId(newUser.id);
	};

	const setCurrentUser = (userId: string | null) => {
		setCurrentUserId(userId);
	};

	const deleteUser = (userId: string) => {
		setUsers(prev => prev.filter(u => u.id !== userId));
		setCurrentUserId(prev => (prev === userId ? null : prev));
		// Optionally: remove per-user data from AsyncStorage here
	};

	const currentUser = useMemo(
		() => users.find(u => u.id === currentUserId) ?? null,
		[users, currentUserId]
	);

	const value: UserContextValue = {
		users,
		currentUser,
		addUser,
		setCurrentUser,
		deleteUser,
		loading,
	};

	return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextValue => {
	const ctx = useContext(UserContext);
	if (!ctx) throw new Error('useUser must be used within a UserProvider');
	return ctx;
};

'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { scopeLocalStorageKey } from '@/lib/session-user';

const STORAGE_KEY_BASE = 'dashboard.sidebar.collapsed';

type SidebarContextValue = {
	collapsed: boolean;
	toggle: () => void;
	setCollapsed: (value: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
	const [collapsed, setCollapsedState] = useState(false);
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		try {
			const storageKey = scopeLocalStorageKey(STORAGE_KEY_BASE);
			setCollapsedState(localStorage.getItem(storageKey) === '1');
		} catch {
			/* ignore */
		}
		setHydrated(true);
	}, []);

	useEffect(() => {
		if (!hydrated) return;
		try {
			const storageKey = scopeLocalStorageKey(STORAGE_KEY_BASE);
			localStorage.setItem(storageKey, collapsed ? '1' : '0');
		} catch {
			/* ignore */
		}
	}, [collapsed, hydrated]);

	const setCollapsed = useCallback((value: boolean) => {
		setCollapsedState(value);
	}, []);

	const toggle = useCallback(() => {
		setCollapsedState((prev) => !prev);
	}, []);

	return (
		<SidebarContext.Provider value={{ collapsed, toggle, setCollapsed }}>
			{children}
		</SidebarContext.Provider>
	);
}

export function useSidebar() {
	const ctx = useContext(SidebarContext);
	if (!ctx) {
		throw new Error('useSidebar must be used within SidebarProvider');
	}
	return ctx;
}

import React, { useMemo } from 'react';
import ClientCoreContext from './ClientCoreContext';
import { Core } from '@wwwallet-private/client-core';
import { useCoreHttpProxy } from '@/lib/services/CoreWrappers/CoreHttpProxy';
import { CORE_CONFIGURATION } from '@/config';
import { useCoreClientStateStore } from '@/lib/services/CoreWrappers/ClientStateStore';

type ClientCoreContextProviderProps = {
	children: React.ReactNode;
};

export const ClientCoreContextProvider = ({ children }: ClientCoreContextProviderProps) => {
	const httpClient = useCoreHttpProxy();
	const clientStateStore = useCoreClientStateStore();

	const core = useMemo(() => {
		return new Core({
			httpClient,
			clientStateStore,
			...CORE_CONFIGURATION
		});
	}, [httpClient, clientStateStore]);

	return (
		<ClientCoreContext.Provider value={core}>
		{children}
		</ClientCoreContext.Provider>
	);
};

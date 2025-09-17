import React, { useMemo } from 'react';
import ClientCoreContext from './ClientCoreContext';
import { Core } from '@wwwallet-private/client-core';
import { useCoreHttpProxy } from '@/lib/services/CoreWrappers/CoreHttpProxy';
import { OPENID4VCI_REDIRECT_URI } from '@/config';
import { useCoreClientStateStore } from '@/lib/services/CoreWrappers/ClientStateStore';

type ClientCoreContextProviderProps = {
  children: React.ReactNode;
};

export const ClientCoreContextProvider = ({ children }: ClientCoreContextProviderProps) => {
	const httpClient = useCoreHttpProxy();
	const clientStateStore = useCoreClientStateStore();

	const core = useMemo(() => {
    return new Core({
      wallet_url: OPENID4VCI_REDIRECT_URI,
      httpClient,
			clientStateStore
    });
  }, [httpClient, clientStateStore]);

	return (
		<ClientCoreContext.Provider value={core}>
			{children}
		</ClientCoreContext.Provider>
	);
};

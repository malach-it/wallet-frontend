import React, { useMemo } from 'react';
import ClientCoreContext from './ClientCoreContext';
import { Core } from '@wwwallet-private/client-core';
import { useCoreHttpProxy } from '@/lib/services/HttpProxy/CoreHttpProxy';
import { OPENID4VCI_REDIRECT_URI } from '@/config';

type ClientCoreContextProviderProps = {
  children: React.ReactNode;
};

export const ClientCoreContextProvider = ({ children }: ClientCoreContextProviderProps) => {
	const httpClient = useCoreHttpProxy();

	const core = useMemo(() => {
    return new Core({
      wallet_url: OPENID4VCI_REDIRECT_URI,
      httpClient,
    });
  }, [httpClient]);

	return (
		<ClientCoreContext.Provider value={core}>
			{children}
		</ClientCoreContext.Provider>
	);
};

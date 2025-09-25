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
			clientStateStore,
			dpop_ttl_seconds: 60,
			// TEMP
			static_clients: [{
				issuer: "http://issuer.localhost:8003",
				client_id: "CLIENT123",
				client_secret: "superSecretString",
				redirect_uri: OPENID4VCI_REDIRECT_URI,
			}, {
				issuer: "http://wallet-enterprise-issuer:8003",
				client_id: "CLIENT123",
				client_secret: "superSecretString",
				redirect_uri: OPENID4VCI_REDIRECT_URI,
			}, {
				issuer: "http://issuer2.localhost:5000",
				client_id: "CLIENT123",
				client_secret: "321TNEILC",
				redirect_uri: OPENID4VCI_REDIRECT_URI,
			}, {
				issuer: "http://wwwallet-issuer-poc:5000",
				client_id: "CLIENT123",
				client_secret: "321TNEILC",
				redirect_uri: OPENID4VCI_REDIRECT_URI,
			}]
    });
  }, [httpClient, clientStateStore]);

	return (
		<ClientCoreContext.Provider value={core}>
			{children}
		</ClientCoreContext.Provider>
	);
};

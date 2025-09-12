import React from 'react';
import ClientCoreContext from './ClientCoreContext';
import { Core } from '@wwwallet-private/client-core';
import { useCoreHttpProxy } from '@/lib/services/HttpProxy/CoreHttpProxy';
import { OPENID4VCI_REDIRECT_URI } from '@/config';

export const ClientCoreContextProvider = ({ children }) => {
	const config = {
		wallet_url: OPENID4VCI_REDIRECT_URI,
		httpClient: useCoreHttpProxy(),
	};

	const core = new Core(config);

	return (
		<ClientCoreContext.Provider value={core}>
			{children}
		</ClientCoreContext.Provider>
	);
};

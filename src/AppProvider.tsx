// RootProvider.tsx
import React, { ReactNode } from 'react';
import { StatusContextProvider } from './context/StatusContextProvider';
import { SessionContextProvider } from './context/SessionContextProvider';
import { CredentialsContextProvider } from './context/CredentialsContextProvider';
import { OpenID4VPContextProvider } from './context/OpenID4VPContextProvider';
import { OpenID4VCIContextProvider } from './context/OpenID4VCIContextProvider';
import UriHandler from './hocs/UriHandler';
import { ClientCoreContextProvider } from './context/ClientCoreContextProvider';

type RootProviderProps = {
	children: ReactNode;
};

const AppProvider: React.FC<RootProviderProps> = ({ children }) => {
	return (
		<ClientCoreContextProvider>
			<StatusContextProvider>
				<SessionContextProvider>
					<CredentialsContextProvider>
						<OpenID4VPContextProvider>
							<OpenID4VCIContextProvider>
								<UriHandler>
									{children}
								</UriHandler>
							</OpenID4VCIContextProvider>
						</OpenID4VPContextProvider>
					</CredentialsContextProvider>
				</SessionContextProvider>
			</StatusContextProvider>
		</ClientCoreContextProvider>
	);
};

export default AppProvider;

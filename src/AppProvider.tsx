// RootProvider.tsx
import React, { ReactNode } from 'react';
import { StatusContextProvider } from './context/StatusContextProvider';
import { SessionContextProvider } from './context/SessionContextProvider';
import { CredentialsContextProvider } from './context/CredentialsContextProvider';
import { OpenID4VPContextProvider } from './context/OpenID4VPContextProvider';
import { ClientCoreContextProvider } from './context/ClientCoreContextProvider';
import { ErrorDialogContextProvider } from './context/ErrorDialogContextProvider';

type RootProviderProps = {
	children: ReactNode;
};

const AppProvider: React.FC<RootProviderProps> = ({ children }) => {
	return (
		<StatusContextProvider>
			<SessionContextProvider>
				<ErrorDialogContextProvider>
					<CredentialsContextProvider>
						<OpenID4VPContextProvider>
							<ClientCoreContextProvider>
								{children}
							</ClientCoreContextProvider>
						</OpenID4VPContextProvider>
					</CredentialsContextProvider>
				</ErrorDialogContextProvider>
			</SessionContextProvider>
		</StatusContextProvider>
	);
};

export default AppProvider;

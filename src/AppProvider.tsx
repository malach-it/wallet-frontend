// RootProvider.tsx
import React, { ReactNode } from 'react';
import { StatusContextProvider } from './context/StatusContextProvider';
import { SessionContextProvider } from './context/SessionContextProvider';
import { CredentialsContextProvider } from './context/CredentialsContextProvider';
import { OpenID4VPContextProvider } from './context/OpenID4VPContextProvider';
import { OpenID4VCIContextProvider } from './context/OpenID4VCIContextProvider';
import { UriHandler } from './hocs/UriHandler';
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
							<OpenID4VCIContextProvider>
								<ClientCoreContextProvider>
									<UriHandler>
										{children}
									</UriHandler>
								</ClientCoreContextProvider>
							</OpenID4VCIContextProvider>
						</OpenID4VPContextProvider>
					</CredentialsContextProvider>
				</ErrorDialogContextProvider>
			</SessionContextProvider>
		</StatusContextProvider>
	);
};

export default AppProvider;

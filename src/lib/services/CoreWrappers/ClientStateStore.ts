import { useContext } from 'react';
import type { ClientState, ClientStateStore, IssuerMetadata } from '@wwwallet-private/client-core'
import { WalletStateUtils } from '@/services/WalletStateUtils';
import SessionContext from '@/context/SessionContext';
import { generateRandomIdentifier } from '@/lib/utils/generateRandomIdentifier';
import { WalletStateCredentialIssuanceSession } from '@/services/WalletStateOperations';
import pkceChallenge from 'pkce-challenge';
import { useOpenID4VCIClientStateRepository } from '../OpenID4VCIClientStateRepository';

export function useCoreClientStateStore(): ClientStateStore {
	const openID4VCIClientStateRepository = useOpenID4VCIClientStateRepository();
	const { keystore, api, isLoggedIn } = useContext(SessionContext);

	return {
		async create(issuer, issuer_state) {
			const userHandleB64u = keystore.getUserHandleB64u();
			const state = btoa(JSON.stringify({ userHandleB64u: userHandleB64u, id: generateRandomIdentifier(12) })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

			const { code_verifier } = await pkceChallenge()

			const session = {
				sessionId: WalletStateUtils.getRandomUint32(),
				credentialIssuerIdentifier: issuer,
				code_verifier,
				state,
				issuer_state,
				client_state: {
					issuer,
					issuer_state,
					state,
					code_verifier,
				},
				created: Math.floor(Date.now() / 1000)
			} satisfies WalletStateCredentialIssuanceSession;

			await openID4VCIClientStateRepository.create(session);

			return session.client_state;
		},

		async fromIssuerState(issuer: string, issuer_state: string): Promise<ClientState> {
			const session = await openID4VCIClientStateRepository.getByIssuerState(issuer_state);
			session.client_state.context = session;

			return session.client_state;
		},

		async setCredentialConfigurationIds(clientState: ClientState, credentialConfigurationIds: Array<string>): Promise<ClientState> {
			const session = await openID4VCIClientStateRepository.getByIssuerState(clientState.issuer_state);

			const newSession = {
				...session,
				client_state: {
					...session.client_state,
					credential_configuration_ids: credentialConfigurationIds.slice(0, 1),
				},
				credentialConfigurationId: credentialConfigurationIds[0]
			} satisfies WalletStateCredentialIssuanceSession;

			await openID4VCIClientStateRepository.updateState(newSession);

			return newSession.client_state
		},

		async setIssuerMetadata(clientState: ClientState, issuerMetadata: IssuerMetadata): Promise<ClientState> {
			const session = await openID4VCIClientStateRepository.getByIssuerState(clientState.issuer_state);

			const newSession = {
				...session,
				client_state: {
					...session.client_state,
					issuer_metadata: issuerMetadata,
				}
			} satisfies WalletStateCredentialIssuanceSession;

			await openID4VCIClientStateRepository.updateState(newSession);

			return newSession.client_state;
		},
	}
}

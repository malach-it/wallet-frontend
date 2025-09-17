import { useCallback, useContext, useMemo } from 'react';
import type { ClientState, ClientStateStore } from '@wwwallet-private/client-core'
import { WalletStateUtils } from '@/services/WalletStateUtils';
import SessionContext from '@/context/SessionContext';
import { generateRandomIdentifier } from '@/lib/utils/generateRandomIdentifier';
import { WalletStateCredentialIssuanceSession } from '@/services/WalletStateOperations';
import pkceChallenge from 'pkce-challenge';
import { useOpenID4VCIClientStateRepository } from '../OpenID4VCIClientStateRepository';

export function useCoreClientStateStore(): ClientStateStore {
	const openID4VCIClientStateRepository = useOpenID4VCIClientStateRepository();
	const { keystore } = useContext(SessionContext);

	const create = useCallback<ClientStateStore["create"]>(async (issuer, issuer_state) => {
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
	}, [keystore, openID4VCIClientStateRepository]);

	const fromIssuerState = useCallback<ClientStateStore["fromIssuerState"]>(async (issuer, issuer_state): Promise<ClientState> => {
		const session = await openID4VCIClientStateRepository.getByIssuerState(issuer_state);
		session.client_state.context = session;

		return session.client_state;
	}, [openID4VCIClientStateRepository])

	const setCredentialConfigurationIds = useCallback<ClientStateStore["setCredentialConfigurationIds"]>(async (clientState, credentialConfigurationIds): Promise<ClientState> => {
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
		// TODO: We need a better way to do the below, right now state is only saved at this step and not durinc creation...
		await openID4VCIClientStateRepository.commitStateChanges();

		return newSession.client_state
	}, [openID4VCIClientStateRepository])

	const setIssuerMetadata = useCallback<ClientStateStore["setIssuerMetadata"]>(async (clientState, issuerMetadata): Promise<ClientState> => {
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
	}, [openID4VCIClientStateRepository])

	return useMemo(() => ({
		create,
		fromIssuerState,
		setCredentialConfigurationIds,
		setIssuerMetadata,
	}), [
		create,
		fromIssuerState,
		setCredentialConfigurationIds,
		setIssuerMetadata,
	])
}

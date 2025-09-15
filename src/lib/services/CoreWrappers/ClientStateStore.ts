import { useCallback, useContext, useEffect, useRef } from 'react';
import type { ClientState, ClientStateStore, IssuerMetadata } from '@wwwallet-private/client-core'
import { WalletStateUtils } from '@/services/WalletStateUtils';
import SessionContext from '@/context/SessionContext';
import { generateRandomIdentifier } from '@/lib/utils/generateRandomIdentifier';
import { WalletStateCredentialIssuanceSession } from '@/services/WalletStateOperations';
import pkceChallenge from 'pkce-challenge';

export function useCoreClientStateStore(): ClientStateStore {
	// const openID4VCIClientStateRepository = useOpenID4VCIClientStateRepository();
	const { keystore, api, isLoggedIn } = useContext(SessionContext);

	const sessions = useRef(new Map<number, WalletStateCredentialIssuanceSession>());

	useEffect(() => {
		if (keystore && sessions.current.size === 0) {
			const S = keystore.getCalculatedWalletState();
			if (!S) {
				return;
			}
			S.credentialIssuanceSessions.map((session) => {
				sessions.current.set(session.sessionId, session);
			});
			console.log("Loaded Credential Issuance Sessions from keystore = ", Array.from(sessions.current.values()));
		}
	}, [keystore]);

	const commitStateChanges = useCallback(async (): Promise<void> => {
		const [{ }, newPrivateData, keystoreCommit] = await keystore.saveCredentialIssuanceSessions(Array.from(sessions.current.values()));
		await api.updatePrivateData(newPrivateData);
		await keystoreCommit();
	}, [keystore, api]);

	const getByState = useCallback(
		async (state: string): Promise<WalletStateCredentialIssuanceSession | null> => {
			const r = Array.from(sessions.current.values()).filter((S) => S.state === state);
			const res = r[r.length-1];
			return res ? res : null;
		},
		[]
	);

	const getByIssuerState = useCallback(
		async (issuer_state: string): Promise<WalletStateCredentialIssuanceSession | null> => {
			const r = Array.from(sessions.current.values()).filter((S) => S.issuer_state === issuer_state);
			const res = r[r.length-1];

			console.log(sessions)
			console.log(r)
			console.log(issuer_state)
			return res ? res : null;
		},
		[]
	);

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

			sessions.current.set(session.sessionId, session);
			await commitStateChanges()

			return session.client_state;
		},

		async fromIssuerState(issuer: string, issuer_state: string): Promise<ClientState> {
			const session = await getByIssuerState(issuer_state);
			session.client_state.context = session;


			return session.client_state;
		},

		async setCredentialConfigurationIds(clientState: ClientState, credentialConfigurationIds: Array<string>): Promise<ClientState> {
			const session = await getByIssuerState(clientState.issuer_state);

			const newSession = {
				...session,
				client_state: {
					...session.client_state,
					credential_configuration_ids: credentialConfigurationIds.slice(0, 1),
				},
				credentialConfigurationId: credentialConfigurationIds[0]
			} satisfies WalletStateCredentialIssuanceSession;

			sessions.current.set(newSession.sessionId, newSession);
			commitStateChanges();

			const s2 = await getByIssuerState(clientState.issuer_state);

			console.log(s2.credentialConfigurationId)

			return newSession.client_state
		},

		async setIssuerMetadata(clientState: ClientState, issuerMetadata: IssuerMetadata): Promise<ClientState> {
			const session = await getByIssuerState(clientState.issuer_state);

			const newSession = {
				...session,
				client_state: {
					...session.client_state,
					issuer_metadata: issuerMetadata,
				}
			} satisfies WalletStateCredentialIssuanceSession;

			sessions.current.set(newSession.sessionId, newSession);
			commitStateChanges();

			return newSession.client_state;
		}
	}
}

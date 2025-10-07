import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { logger } from '@/logger';
import type { ClientState, ClientStateStore } from '@wwwallet-private/client-core'
import SessionContext from '@/context/SessionContext';
import { generateRandomIdentifier } from '@/lib/utils/generateRandomIdentifier';
import pkceChallenge from 'pkce-challenge';
import { exportJWK, generateKeyPair } from 'jose';
import { WalletStateUtils } from '@/services/WalletStateUtils';
import { WalletStateCredentialIssuanceSession } from '@/services/WalletStateOperations';

type Context = {
	sessionId: number;
}

export function useCoreClientStateStore(): ClientStateStore {
	const { keystore, api } = useContext(SessionContext);

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
			logger.debug("Loaded Credential Issuance Sessions from keystore = ", Array.from(sessions.current.values()));
		}
	}, [keystore]);

	const create = useCallback<ClientStateStore["create"]>(
		async (issuer, issuer_state) => {
			const userHandleB64u = keystore.getUserHandleB64u();
			const state = btoa(
				JSON.stringify({
					userHandleB64u: userHandleB64u,
					id: generateRandomIdentifier(12)
				})
			).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

			const { code_verifier } = await pkceChallenge();

			const { publicKey, privateKey } = await generateKeyPair("ES256", { extractable: true });
			const client_state: ClientState = {
				issuer,
				issuer_state,
				state,
				code_verifier,
				dpopKeyPair: {
					publicKey: await exportJWK(publicKey),
					privateKey: {
						alg: "ES256",
						...await exportJWK(privateKey)
					},
				},
				context: {
					sessionId: WalletStateUtils.getRandomUint32()
				},
			}

			if (!client_state.issuer_state?.length) {
				client_state.issuer_state = 'issuer_state'
			}

			return client_state;
		}, [keystore]);

	const getByCredentialIssuerIdentifierAndCredentialConfigurationId = useCallback(async (
		credentialIssuer: string,
		credentialConfigurationId: string
	): Promise<WalletStateCredentialIssuanceSession | null> => {
		const r = Array.from(sessions.current.values()).filter((S) => S.credentialConfigurationId === credentialConfigurationId && S.credentialIssuerIdentifier === credentialIssuer);
		const res = r[r.length-1];
		return res ? res : null;
	},
		[]
	);

	const getRememberIssuerAge = useCallback(async (): Promise<number | null> => {
		if (!keystore) {
			return null;
		}
		const S = keystore.getCalculatedWalletState();
		if (!S) {
			return null;
		}
		return parseInt(S.settings['openidRefreshTokenMaxAgeInSeconds']);
	}, [keystore]);

	// TODO: Expose this to be triggered in more optimal place
	const cleanupExpired = useCallback(async (): Promise<void> => {
		const rememberIssuerForSeconds = await getRememberIssuerAge();
		logger.debug("Rememeber issuer for seconds = ", rememberIssuerForSeconds)

		if (rememberIssuerForSeconds == null) {
			return;
		}
		for (const res of Array.from(sessions.current.values())) {
			logger.debug("Res i: ", res);
			if (res.created &&
				typeof res.created === 'number' &&
				Math.floor(Date.now() / 1000) > res.created + rememberIssuerForSeconds) {
				logger.debug("Removed session id = ", res.sessionId)
				sessions.current.delete(res.sessionId);
			}
		}
	}, [getRememberIssuerAge]);

	const commitChanges = useCallback<ClientStateStore["commitChanges"]>(
		async (clientState: ClientState): Promise<ClientState> => {
			// TODO: Expose this to be triggered in more optimal place
			await cleanupExpired();

			const existingState = await getByCredentialIssuerIdentifierAndCredentialConfigurationId(
				clientState.issuer,
				clientState.credential_configuration_ids[0]
			);

			if (existingState) {
				sessions.current.delete(existingState.sessionId);
			}

			sessions.current.set((<Context>clientState.context).sessionId, {
				sessionId: (<Context>clientState.context).sessionId,
				credentialIssuerIdentifier: clientState.issuer,
				credentialConfigurationId: clientState.credential_configuration_ids[0],
				state: clientState.state,
				issuer_state: clientState.issuer_state,
				client_state: clientState,
				code_verifier: clientState.code_verifier,
				created: Math.floor(Date.now() / 1000),
			})

			const [{ }, newPrivateData, keystoreCommit] = await keystore.saveCredentialIssuanceSessions(Array.from(sessions.current.values()));
			await api.updatePrivateData(newPrivateData);
			await keystoreCommit();


			console.trace();

			return clientState;
		},
		[api, keystore]
	)

	const fromIssuerState = useCallback<ClientStateStore["fromIssuerState"]>(
		async (issuer, issuer_state): Promise<ClientState> => {
			const r = Array.from(sessions.current.values()).filter((S) => S.issuer_state === issuer_state);
			const res = r[r.length-1];
			return res && res.client_state ? res.client_state : null;
		},
		[]
	)

	const fromState = useCallback<ClientStateStore["fromState"]>(
			async (state): Promise<ClientState> => {
				console.log(Array.from(sessions.current.values()))
				const r = Array.from(sessions.current.values()).filter((S) => S.state === state);
				const res = r[r.length-1];
				return res && res.client_state ? res.client_state : null;
			},
			[]
	)

	const setCredentialConfigurationIds = useCallback<ClientStateStore["setCredentialConfigurationIds"]>(
		async (clientState, credentialConfigurationIds): Promise<ClientState> => {
			const newClientState: ClientState = {
				...clientState,
				credential_configuration_ids: credentialConfigurationIds,
			};

			return newClientState
		},
		[]
	)

	const setIssuerMetadata = useCallback<ClientStateStore["setIssuerMetadata"]>(
		async (clientState, issuerMetadata): Promise<ClientState> => {
			const newClientState: ClientState = {
				...clientState,
				issuer_metadata: issuerMetadata,
			};

		return newClientState
	}, [])

	return useMemo(() => ({
		create,
		commitChanges,
		fromIssuerState,
		fromState,
		setCredentialConfigurationIds,
		setIssuerMetadata,
	}), [
		create,
		commitChanges,
		fromIssuerState,
		fromState,
		setCredentialConfigurationIds,
		setIssuerMetadata,
	])
}

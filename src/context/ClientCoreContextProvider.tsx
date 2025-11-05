import React, { useContext, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ClientCoreContext from './ClientCoreContext';
import { Core, PresentationRequest, PresentationResponse } from '@wwwallet-private/client-core';
import { AppDispatch, AppState, signJwtPresentation } from '@/store';
import { useCoreHttpProxy } from '@/lib/services/CoreWrappers/CoreHttpProxy';
import { CORE_CONFIGURATION } from '@/config';
import { useCoreClientStateStore } from '@/lib/services/CoreWrappers/ClientStateStore';
import axios from 'axios';
import {EncryptJWT, importJWK} from 'jose';
import {useLocalStorageKeystore} from '@/services/LocalStorageKeystore';
import keystoreEvents from '@/services/keystoreEvents';
import SessionContext from './SessionContext';

type ClientCoreContextProviderProps = {
	children: React.ReactNode;
};

const retrieveKeys = async (presentation_request: PresentationRequest) => {
	if (presentation_request.client_metadata.jwks) {
		const jwk = presentation_request.client_metadata.jwks.keys.filter(k => {
			return k.use === 'enc' && k.kty === 'EC'
		})[0];
		if (!jwk) {
			throw new Error("Could not find Relying Party public key for encryption");
		}
		return { jwk, alg: "ECDH-ES" };
	}
	if (presentation_request.client_metadata.jwks_uri) {
		const response = await axios.get(presentation_request.client_metadata.jwks_uri).catch(() => null);
		if (response && 'keys' in response.data) {
			const jwk = response.data.keys.filter((k) => {
				return k.use === 'enc' && k.kty === "EC"
			})[0];
			if (!jwk) {
				throw new Error("Could not find Relying Party public key for encryption");
			}
			return { jwk, alg: "ECDH-ES" };
		}
	}
	throw new Error("Could not find Relying Party public key for encryption");
};

export const ClientCoreContextProvider = ({ children }: ClientCoreContextProviderProps) => {
	const dispatch = useDispatch() as AppDispatch;
	const httpClient = useCoreHttpProxy();
	const clientStateStore = useCoreClientStateStore();
	// const { keystore } = useContext(SessionContext)
	// const { signJwtPresentation } = keystore

	const vpTokenSigner = useMemo(() => ({
		sign: async (payload: unknown, presentation_request: PresentationRequest) => {
			const result = await dispatch(signJwtPresentation({
				nonce: presentation_request.nonce,
				audience: presentation_request.client_id,
				verifiableCredentials: Object.values(payload).flat(),
			}));

			console.log(result);
			if (result.payload) return (result.payload as { vpjwt }).vpjwt;

			throw new Error(JSON.stringify(result));
		},
		encryptResponse: async (response: PresentationResponse, presentation_request: PresentationRequest) => {
			const { jwk, alg } = await retrieveKeys(presentation_request);
			const publicKey = await importJWK(jwk, alg);
			const vp_token = {};
			presentation_request.dcql_query.credentials.forEach(({ id }) => {
				vp_token[id] = response.vp_token
			})
			return await new EncryptJWT({
				vp_token,
				state: response.state,
				presentation_submission: {},
			})
				// .setKeyManagementParameters({ apu: new TextEncoder().encode(apu), apv: new TextEncoder().encode(apv) })
				.setProtectedHeader({
					alg: presentation_request.client_metadata.authorization_encrypted_response_alg,
					enc: presentation_request.client_metadata.authorization_encrypted_response_enc,
					kid: jwk.kid
				})
				.encrypt(publicKey);
		},
	}), [])

	const core = useMemo(() => {
		return new Core({
			httpClient,
			clientStateStore,
			vpTokenSigner,
			...CORE_CONFIGURATION
		});
	}, [httpClient, clientStateStore, vpTokenSigner]);

	return (
		<ClientCoreContext.Provider value={core}>
		{children}
		</ClientCoreContext.Provider>
	);
};

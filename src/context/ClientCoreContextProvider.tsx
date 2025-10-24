import React, { useMemo } from 'react';
import ClientCoreContext from './ClientCoreContext';
import { Core, PresentationRequest, PresentationResponse } from '@wwwallet-private/client-core';
import { useCoreHttpProxy } from '@/lib/services/CoreWrappers/CoreHttpProxy';
import { CORE_CONFIGURATION } from '@/config';
import { useCoreClientStateStore } from '@/lib/services/CoreWrappers/ClientStateStore';
import axios from 'axios';
import {EncryptJWT, importJWK} from 'jose';
import {useLocalStorageKeystore} from '@/services/LocalStorageKeystore';
import keystoreEvents from '@/services/keystoreEvents';

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
	const httpClient = useCoreHttpProxy();
	const clientStateStore = useCoreClientStateStore();
	const keystore = useLocalStorageKeystore(keystoreEvents);
	const vpTokenSigner = {
		sign: async (payload: unknown, presentation_request: PresentationRequest) => {
			const { vpjwt } = await keystore.signJwtPresentation(
				presentation_request.nonce,
				presentation_request.client_id,
				Object.values(payload).flat(),
				null, // TODO manage transaction data
			);

			return vpjwt;
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
	}

	const core = useMemo(() => {
		return new Core({
			httpClient,
			clientStateStore,
			vpTokenSigner,
			...CORE_CONFIGURATION
		});
	}, [httpClient, clientStateStore]);

	return (
		<ClientCoreContext.Provider value={core}>
		{children}
		</ClientCoreContext.Provider>
	);
};

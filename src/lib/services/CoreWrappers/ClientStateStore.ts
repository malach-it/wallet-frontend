import type { IssuerMetadata } from '@wwwallet-private/client-core'
import { useOpenID4VCIClientStateRepository } from '../OpenID4VCIClientStateRepository';

interface ClientState {
	issuer: string;
	issuer_state: string;
	issuerMetadata?: IssuerMetadata;
}

type ClientStateStore = {
	create(issuer: string, issuer_state: string): Promise<ClientState>;
	// fromIssuerState(issuer: string, issuer_state: string): Promise<ClientState>;
	// setIssuerMetadata(clientState: ClientState, issuerMetadata: IssuerMetadata): Promise<ClientState>;
}

export function useCoreClientStateStore(): ClientStateStore {
	const openID4VCIClientStateRepository = useOpenID4VCIClientStateRepository();

	return {
		async create(issuer, issuer_state) {
			await openID4VCIClientStateRepository.create({
				sessionId: 0,
				credentialIssuerIdentifier: issuer,
				state: issuer_state,
				code_verifier: '',
				credentialConfigurationId: '',
				created: 0
			})
			await openID4VCIClientStateRepository.commitStateChanges();

			return {issuer, issuer_state}
		},
		// async fromIssuerState(issuer, issuer_state) {},
		// async setIssuerMetadata(clientState, issuerMetadata) {},
	}
}

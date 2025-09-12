import type { ClientState, ClientStateStore, IssuerMetadata } from '@wwwallet-private/client-core'
import { useOpenID4VCIClientStateRepository } from '../OpenID4VCIClientStateRepository';
import { WalletStateUtils } from '@/services/WalletStateUtils';

export function useCoreClientStateStore(): ClientStateStore {
	const openID4VCIClientStateRepository = useOpenID4VCIClientStateRepository();

	return {
		async create(issuer, issuer_state) {
			await openID4VCIClientStateRepository.create({
				sessionId: WalletStateUtils.getRandomUint32(),
				credentialIssuerIdentifier: issuer,
				state: issuer_state,
				code_verifier: '',
				credentialConfigurationId: '',
				created: Math.floor(Date.now() / 1000)
			});
			await openID4VCIClientStateRepository.commitStateChanges();

			return { issuer, issuer_state };
		},
		async fromIssuerState(issuer: string, issuer_state: string): Promise<ClientState> {
			throw new Error('fromIssuerState: function not implemented.');
		},
		async setCredentialConfigurationIds(clientState: ClientState, credentialConfigurationIds: Array<string>): Promise<ClientState> {
			throw new Error('setCredentialConfigurationIds: function not implemented.');
		},
		async setIssuerMetadata (clientState: ClientState, issuerMetadata: IssuerMetadata): Promise<ClientState> {
			throw new Error('setIssuerMetadata: function not implemented.');
		}
	}
}

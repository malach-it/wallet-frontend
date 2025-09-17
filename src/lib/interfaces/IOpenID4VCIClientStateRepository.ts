import { WalletStateCredentialIssuanceSession } from "@/services/WalletStateOperations";

export interface IOpenID4VCIClientStateRepository {
	getByState(state: string): Promise<WalletStateCredentialIssuanceSession | null>;
	getByIssuerState(state: string): Promise<WalletStateCredentialIssuanceSession | null>;
	getByCredentialIssuerIdentifierAndCredentialConfigurationId(credentialIssuerIdentifier: string, credentialConfigurationId: string): Promise<WalletStateCredentialIssuanceSession | null>;
	create(s: WalletStateCredentialIssuanceSession): Promise<void>;
	updateState(s: WalletStateCredentialIssuanceSession): Promise<void>;
	cleanupExpired(): Promise<void>;
	commitStateChanges(): Promise<void>;
}

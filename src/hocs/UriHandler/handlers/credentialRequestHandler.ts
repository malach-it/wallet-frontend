import { calculateJwkThumbprint, decodeJwt, JWK } from "jose";
import { Core, OauthError } from "@wwwallet-private/client-core";
import { type HandlerFactoryResponse } from "../resources";
import { BackendApi } from '../../../api';
import { logger, jsonToLog } from "../../../logger";
import type { LocalStorageKeystore } from '../../../services/LocalStorageKeystore';
import { WalletStateUtils } from "../../../services/WalletStateUtils";

export type AuthorizeHandlerFactoryConfig = {
	keystore: LocalStorageKeystore;
	api: BackendApi;
	core: Core;
}

export function credentialRequestHandlerFactory(config: AuthorizeHandlerFactoryConfig): HandlerFactoryResponse {
	const { core, keystore, api } = config;
	return async (params: { access_token: string, state: string, c_nonce: string }) => {
				const clientState = JSON.parse(localStorage.getItem("clientStates") || '[]')
						.find((clientState) => {
							return clientState.state === params.state
						})
				const credential_configuration_ids = clientState
						?.credential_configuration_ids || []
				const audience = clientState.issuer_metadata.issuer
				const issuer = core.config.static_clients.find(({ issuer }) => issuer === audience)?.client_id

				for (const credential_configuration_id of credential_configuration_ids) {
					const [
						{ proof_jwts },
						proofsData,
						proofsCommit
					] = await keystore.generateOpenid4vciProofs([{
						nonce: params.c_nonce,
						audience,
						issuer,
					}]);
					try {
						// await api.updatePrivateData(proofsData);
						// await proofsCommit()

						const { data: { credentials } } = await core.credential({
							...params,
							credential_configuration_id,
							proofs: {
								jwt: proof_jwts,
							},
						})

						const batchId = WalletStateUtils.getRandomUint32();
						const [, credentialsData, credentialsCommit] = await keystore.addCredentials(
							await Promise.all(credentials.map(async ({ credential }, index: number) => {
								const { cnf }  = decodeJwt(credential) as { cnf: { jwk: JWK } };
								const res = {
									data: credential,
									format: "vc+sd-jwt",
									kid: cnf && await calculateJwkThumbprint(cnf.jwk as JWK) || "",
									credentialConfigurationId: credential_configuration_id,
									credentialIssuerIdentifier: clientState.issuer_metadata.issuer,
									batchId,
									instanceId: index,
								}
								return res;
							}))
						)

						await api.updatePrivateData(credentialsData);
						await credentialsCommit();


					} catch(err) {
						if (err instanceof OauthError) {
							logger.error("OAuth error:", jsonToLog(err));
						} else {
							logger.error(err);
						}
					}
				}
			}
}

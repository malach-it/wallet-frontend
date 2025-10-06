import { TFunction } from "i18next";
import { calculateJwkThumbprint, decodeJwt, JWK } from "jose";
import { Core, OauthError } from "@wwwallet-private/client-core";
import { DisplayErrorFunction } from "@/context/ErrorDialogContext";
import { type HandlerFactoryResponse } from "../resources";
import { BackendApi } from '../../../api';
import { logger, jsonToLog } from "../../../logger";
import type { LocalStorageKeystore } from '../../../services/LocalStorageKeystore';
import { WalletStateUtils } from "../../../services/WalletStateUtils";

export type AuthorizeHandlerFactoryConfig = {
	keystore: LocalStorageKeystore;
	api: BackendApi;
	core: Core;
	displayError: DisplayErrorFunction;
	t: TFunction<"translation", undefined>;
}

export function credentialRequestHandlerFactory(config: AuthorizeHandlerFactoryConfig): HandlerFactoryResponse {
	const { core, keystore, api, displayError, t } = config;
	return async function credentialRequestHanlder(params: { access_token: string, state: string, c_nonce: string }) {

				const clientState = await core.config.clientStateStore.fromState(params.state);
				console.log(clientState)

				const credential_configuration_ids = clientState
						?.credential_configuration_ids || []
				const audience = clientState.issuer
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

						const { data: { credentials }, nextStep } = await core.credential({
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
									credentialIssuerIdentifier: clientState.issuer,
									batchId,
									instanceId: index,
								}
								return res;
							}))
						)

						await api.updatePrivateData(credentialsData);
						await credentialsCommit();

						this[nextStep]({});
					} catch(err) {
						if (err instanceof OauthError) {
							logger.error(t(`errors.${err.error}`), jsonToLog(err));
							displayError({
								title: t(`errors.${err.error}`),
								emphasis: t(`errors.${err.data.protocol}.${err.data.currentStep}.description.${err.data.nextStep}`),
								description: t(`errors.${err.data.protocol}.${err.data.currentStep}.${err.error}`),
								err,
							});
						} else {
							logger.error(err);
						}
					}
				}
			}
}

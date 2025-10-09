import { TFunction } from "i18next";
import { calculateJwkThumbprint, decodeJwt, JWK } from "jose";
import { Core, OauthError } from "@wwwallet-private/client-core";
import { DisplayErrorFunction } from "@/context/ErrorDialogContext";
import { StepHandlerID, type HandlerFactoryResponse } from "../resources";
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

	return async function credentialRequestHandler(params: { access_token: string, state: string, c_nonce: string }) {
		let nextStepId: StepHandlerID;
		const clientState = await core.config.clientStateStore.fromState(params.state);

		const credentialConfigurationIds = clientState
				?.credential_configuration_ids || [];
		const audience = clientState.issuer;
		const issuer = core.config.static_clients.find(({ issuer }) => issuer === audience)?.client_id;

		try {
			const callback = async ({ credentialConfigurationId, proof_jwts }) => {
				const { data: { credentials }, nextStep } = await core.credential({
					...params,
					credential_configuration_id: credentialConfigurationId,
					proofs: {
						jwt: proof_jwts,
					},
				});
				nextStepId = nextStep

				const batchId = WalletStateUtils.getRandomUint32();
				return await Promise.all(credentials.map(async ({ credential, format }, index: number) => {
					const { cnf }  = decodeJwt(credential) as { cnf: { jwk: JWK } };
					const res = {
						data: credential,
						format,
						kid: cnf && await calculateJwkThumbprint(cnf.jwk as JWK) || "",
						credentialConfigurationId,
						credentialIssuerIdentifier: clientState.issuer,
						batchId,
						instanceId: index,
					}
					return res;
				}))
			};

			const [{}, credentialsData, credentialsCommit] = await keystore.requestAndAddCredentials(
				[{
					nonce: params.c_nonce,
					audience,
					issuer,
				}],
				credentialConfigurationIds,
				callback,
			);

			await core.config.clientStateStore.cleanupExpired();

			await api.updatePrivateData(credentialsData);
			await credentialsCommit();

			if (nextStepId) this[nextStepId]({});
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


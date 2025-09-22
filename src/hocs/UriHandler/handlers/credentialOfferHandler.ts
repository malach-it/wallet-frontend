import { type Core, OauthError } from "@wwwallet-private/client-core";
import { type HandlerFactoryResponse } from "../resources";
import {jsonToLog, logger} from "@/logger";

export type CredentialOfferHandlerFactoryConfig = {
	core: Core;
}

type PushedAuthorizationRequestMetadata = {
	issuer: string;
  credential_configuration_ids: string[];
  issuer_state?: string | undefined;
};

export function credentialOfferHandlerFactory(config: CredentialOfferHandlerFactoryConfig): HandlerFactoryResponse {
	const { core } = config;

	return async function credentialOfferHandler({ issuer, credential_configuration_ids, issuer_state}: PushedAuthorizationRequestMetadata) {

		try {
			const { nextStep, data } = await core.authorization({
				issuer: issuer,
				issuer_state: issuer_state ?? 'issuer_state',
			})

			this[nextStep](data)
		} catch (err) {
			if (err instanceof OauthError) logger.error("OAuth error:", jsonToLog(err));
			throw err
		}
	}
}

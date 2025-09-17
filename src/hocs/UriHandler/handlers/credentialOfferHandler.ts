import { Core } from "@wwwallet-private/client-core";
import { type HandlerFactoryResponse } from "../resources";
import { type IOpenID4VCIHelper } from "@/lib/interfaces/IOpenID4VCIHelper";
import { type IOpenID4VCI } from "@/lib/interfaces/IOpenID4VCI";

export type CredentialOfferHandlerFactoryConfig = {
	core: Core;
	url: string
	openID4VCI: IOpenID4VCI;
	openID4VCIHelper: IOpenID4VCIHelper;
}

type PushedAuthorizationRequestMetadata = {
	issuer: string;
  credential_configuration_ids: string[];
  issuer_state?: string | undefined;
};

export function credentialOfferHandlerFactory(config: CredentialOfferHandlerFactoryConfig): HandlerFactoryResponse {
	const { core, url, openID4VCI, openID4VCIHelper } = config;

	return async function credentialOfferHandler({ issuer, credential_configuration_ids, issuer_state}: PushedAuthorizationRequestMetadata) {

		try {
			const { client_id } = await openID4VCIHelper.getClientId(issuer)
			const { authzServeMetadata } = await openID4VCIHelper.getAuthorizationServerMetadata(issuer)
			const { metadata } = await openID4VCIHelper.getCredentialIssuerMetadata(issuer);

			// core.config.static_clients = [{
			// 	issuer: authzServeMetadata.issuer,
			// 	client_id: client_id,
			// }];

			const { protocol, nextStep, data } = await core.authorization({
				issuer: issuer,
				issuer_state: issuer_state ?? 'issuer_state',
			});

			console.log(data)

			this[nextStep](data)
		} catch (err) {
				// window.history.replaceState({}, '', `${window.location.pathname}`);
				console.error(err);
		}

		// handleCredentialOffer(u.toString()).then(({ credentialIssuer, selectedCredentialConfigurationId, issuer_state }) => {
		// 	console.log("Generating authorization request...");
			// return generateAuthorizationRequest(credentialIssuer, selectedCredentialConfigurationId, issuer_state);
		// }).then((res) => {
		// 	if ('url' in res && res.url) {
		// 		// window.location.href = res.url;
		// 		alert(res.url)
		// 	}
		// })
		// 	.catch(err => {
		// 		window.history.replaceState({}, '', `${window.location.pathname}`);
		// 		console.error(err);
		// 	})
		// return;
	}
}

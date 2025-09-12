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
  credential_configuration_ids: string[];
  issuer_state?: string | undefined;
};

export function credentialOfferHandlerFactory(config: CredentialOfferHandlerFactoryConfig): HandlerFactoryResponse {
	const { core, url, openID4VCI, openID4VCIHelper } = config;

	return async function credentialOfferHandler({ credential_configuration_ids, issuer_state}: PushedAuthorizationRequestMetadata) {

		try {
			const { credentialIssuer } = await openID4VCI.handleCredentialOffer(url);

			const { client_id } = await openID4VCIHelper.getClientId(credentialIssuer)
			const { authzServeMetadata } = await openID4VCIHelper.getAuthorizationServerMetadata(credentialIssuer)
			const { metadata } = await openID4VCIHelper.getCredentialIssuerMetadata(credentialIssuer);


			core.config.static_clients = [{
				issuer: authzServeMetadata.issuer,
				client_id: client_id,
				scope: metadata.credential_configurations_supported[credential_configuration_ids[0]].scope
			}];

			const { protocol, nextStep, data: { authorize_url } } = await core.pushedAuthorizationRequest({
				issuer: credentialIssuer,
				issuer_state: issuer_state ?? 'issuer_state',
			});

			if (authorize_url) {
				this[nextStep]({ authorize_url })
			}
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

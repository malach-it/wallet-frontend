import { Core } from "@wwwallet-private/client-core";
import { type HandlerFactoryResponse } from "../resources";
import { HandleAuthorizationRequestError, type IOpenID4VP } from "@/lib/interfaces/IOpenID4VP";
import { TFunction } from "i18next";

export type PresentationHandlerFactoryConfig = {
	core: Core;
	url: string
	openID4VP: IOpenID4VP;
	vcEntityList: any[];
	t: TFunction<"translation", undefined>;
	setUsedRequestUris: React.Dispatch<React.SetStateAction<string[]>>;
	setMessagePopup: React.Dispatch<React.SetStateAction<boolean>>
	setTypeMessagePopup: React.Dispatch<React.SetStateAction<string>>
	setTextMessagePopup: React.Dispatch<React.SetStateAction<{
    title: string;
    description: string;
	}>>;
	setRedirectUri: React.Dispatch<any>
}

export function presentationHandlerFactory(config: PresentationHandlerFactoryConfig): HandlerFactoryResponse {
	const { core, url, openID4VP, vcEntityList, t, setUsedRequestUris, setMessagePopup, setTypeMessagePopup, setTextMessagePopup, setRedirectUri } = config;

	return async function presentationHandler({}) {
		const u = new URL(url)
		setUsedRequestUris((uriArray) => [...uriArray, u.searchParams.get('request_uri')]);

		await openID4VP.handleAuthorizationRequest(u.toString(), vcEntityList).then((result) => {
			console.log("Result = ", result);

			if ('error' in result) {
				if (result.error === HandleAuthorizationRequestError.INSUFFICIENT_CREDENTIALS) {
					setTextMessagePopup({ title: `${t('messagePopup.insufficientCredentials.title')}`, description: `${t('messagePopup.insufficientCredentials.description')}` });
					setTypeMessagePopup('error');
					setMessagePopup(true);
				}
				else if (result.error === HandleAuthorizationRequestError.NONTRUSTED_VERIFIER) {
					setTextMessagePopup({ title: `${t('messagePopup.nonTrustedVerifier.title')}`, description: `${t('messagePopup.nonTrustedVerifier.description')}` });
					setTypeMessagePopup('error');
					setMessagePopup(true);
				}
				return;
			}
			const { conformantCredentialsMap, verifierDomainName, verifierPurpose } = result;
			const jsonedMap = Object.fromEntries(conformantCredentialsMap);

			console.log("Prompting for selection..")

			return openID4VP.promptForCredentialSelection(jsonedMap, verifierDomainName, verifierPurpose);
		}).then((selection) => {
			if (!(selection instanceof Map)) {
				return;
			}

			console.log("Selection = ", selection);

			return openID4VP.sendAuthorizationResponse(selection, vcEntityList);

		}).then((res) => {
			if (res && 'url' in res && res.url) {
				setRedirectUri(res.url);
			}
		}).catch(err => {
			console.log("Failed to handle authorization req");
			window.history.replaceState({}, '', `${window.location.pathname}`);
			console.error(err);
		})
		return;
	}
}

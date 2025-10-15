import { logger } from "@/logger";
import { HandlerHook, HandlerHookConfig } from "../resources";
import { HandleAuthorizationRequestError } from "@/lib/interfaces/IOpenID4VP";
import useClientCore from "@/hooks/useClientCore";
import { useCallback, useContext } from "react";
import OpenID4VPContext from "@/context/OpenID4VPContext";
import CredentialsContext from "@/context/CredentialsContext";
import { useTranslation } from "react-i18next";
import useErrorDialog from "@/hooks/useErrorDialog";

type Config = HandlerHookConfig & {
	setUsedRequestUris: React.Dispatch<React.SetStateAction<string[]>>;
}

export function usePresentationHandler({ goToStep, data, setUsedRequestUris }: Config): HandlerHook {
	const core = useClientCore();
	const url = window.location.toString();
	const { openID4VP } = useContext(OpenID4VPContext);
	const { vcEntityList } = useContext(CredentialsContext);
	const { t } = useTranslation();
	const { displayError } = useErrorDialog();

	return useCallback(async ({}) => {
		const u = new URL(url)
		setUsedRequestUris((uriArray) => [...uriArray, u.searchParams.get('request_uri')]);

		await openID4VP.handleAuthorizationRequest(u.toString(), vcEntityList).then((result) => {
			logger.debug("Result = ", result);

			if ('error' in result) {
				if (result.error === HandleAuthorizationRequestError.INSUFFICIENT_CREDENTIALS) {
					displayError({
						title: `${t('messagePopup.insufficientCredentials.title')}`,
						description: `${t('messagePopup.insufficientCredentials.description')}`
					});
				}
				else if (result.error === HandleAuthorizationRequestError.NONTRUSTED_VERIFIER) {
					displayError({
						title: `${t('messagePopup.nonTrustedVerifier.title')}`,
						description: `${t('messagePopup.nonTrustedVerifier.description')}`
					});
				}
				return;
			}
			const { conformantCredentialsMap, verifierDomainName, verifierPurpose } = result;
			const jsonedMap = Object.fromEntries(conformantCredentialsMap);

			logger.debug("Prompting for selection..")

			return openID4VP.promptForCredentialSelection(jsonedMap, verifierDomainName, verifierPurpose);
		}).then((selection) => {
			if (!(selection instanceof Map)) {
				return;
			}

			logger.debug("Selection = ", selection);

			return openID4VP.sendAuthorizationResponse(selection, vcEntityList);

		}).then((res) => {
			if (res && 'url' in res && res.url) {
				window.location.href = res.url;
			}
		}).catch(err => {
			logger.debug("Failed to handle authorization req");
			window.history.replaceState({}, '', `${window.location.pathname}`);
			logger.error(err);
		})
		return;
	}, []);
}

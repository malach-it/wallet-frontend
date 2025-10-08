import React, { useContext, useEffect } from "react";
import { logger } from "@/logger";
import { HandleAuthorizationRequestError } from "@/lib/interfaces/IOpenID4VP";
import { ProtocolData, ProtocolStep } from "../resources";

import CredentialsContext from "@/context/CredentialsContext";
import OpenID4VPContext from "@/context/OpenID4VPContext";

import useErrorDialog from "@/hooks/useErrorDialog";
import {useTranslation} from "react-i18next";

type PresentationHandlerProps = {
	goToStep: (step: ProtocolStep, data: ProtocolData) => void
	data: any
}

export const PresentationHandler = ({ goToStep: _goToStep, data: _data }: PresentationHandlerProps) => {
	const { t } = useTranslation();
	const { openID4VP } = useContext(OpenID4VPContext);
	const { vcEntityList } = useContext(CredentialsContext);
	const { displayError } = useErrorDialog();
	const u = new URL(window.location.href)

	useEffect(() => {
		if (!vcEntityList) return

		openID4VP.handleAuthorizationRequest(u.toString(), vcEntityList).then((result) => {
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
	}, [vcEntityList])
	return (
		<></>
	)
}

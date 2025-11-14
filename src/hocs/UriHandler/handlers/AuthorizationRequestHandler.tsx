import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { OauthError } from "@wwwallet-private/client-core";
import { jsonToLog, logger } from "@/logger";
import { AppState } from "@/store";
import { ProtocolData, ProtocolStep } from "../resources";

import { useTranslation } from "react-i18next";
import useClientCore from "@/hooks/useClientCore";
import useErrorDialog from "@/hooks/useErrorDialog";

export type AuthorizationRequestHandlerParams = {
	goToStep: (step: ProtocolStep, data: ProtocolData) => void;
	data: any
}

export const AuthorizationRequestHandler = ({ goToStep, data }: AuthorizationRequestHandlerParams) => {

	const {
		issuer,
		credential_configuration_ids: credentialConfigurationIds,
		issuer_state
	} = data
	const isOnline = useSelector((state: AppState) => state.status.isOnline)

	const core = useClientCore();
	const { displayError } = useErrorDialog();
	const { t } = useTranslation();

	useEffect(() => {
		if (!isOnline) return

		core.authorization({
			issuer: issuer,
			issuer_state: issuer_state ?? 'issuer_state',
		}).then(({ nextStep, data }) => {
			return goToStep(nextStep, data)
		}).catch((err) => {
			if (err instanceof OauthError) {
				logger.error(t(`errors.${err.error}`), jsonToLog(err));
				return displayError({
					title: t(`errors.${err.error}`),
					emphasis: t(`errors.${err.data.protocol}.${err.data.currentStep}.description.${err.data.nextStep}`),
					description: t(`errors.${err.data.protocol}.${err.data.currentStep}.${err.error}`),
					err,
				});
			}

			throw err;
		})
	}, [isOnline])

	return (
		<></>
	)
}

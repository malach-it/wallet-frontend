import { TFunction } from "i18next";
import { type Core, OauthError } from "@wwwallet-private/client-core";
import { HandlerHook, HandlerHookConfig } from "../resources";
import {jsonToLog, logger} from "@/logger";
import { DisplayErrorFunction } from "@/context/ErrorDialogContext";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import useClientCore from "@/hooks/useClientCore";
import useErrorDialog from "@/hooks/useErrorDialog";

export type CredentialOfferHandlerFactoryConfig = {
	core: Core;
	displayError: DisplayErrorFunction;
	t: TFunction<"translation", undefined>;
}

type PushedAuthorizationRequestMetadata = {
	issuer: string;
  credential_configuration_ids: string[];
  issuer_state?: string | undefined;
};

export function useCredentialOfferHandler({ goToStep, data }: HandlerHookConfig): HandlerHook {
	const { t } = useTranslation();
	const core = useClientCore();
	const { displayError } = useErrorDialog();

	const credentialOfferHandler = useCallback(async ({ issuer, credential_configuration_ids, issuer_state}: PushedAuthorizationRequestMetadata) => {

		try {
			const { nextStep, data } = await core.authorization({
				issuer: issuer,
				issuer_state: issuer_state ?? 'issuer_state',
			})

			goToStep(nextStep, data);
		} catch (err) {
			if (err instanceof OauthError) {
				logger.error(t(`errors.${err.error}`), jsonToLog(err));
				displayError({
					title: t(`errors.${err.error}`),
					emphasis: t(`errors.${err.data.protocol}.${err.data.currentStep}.description.${err.data.nextStep}`),
					description: t(`errors.${err.data.protocol}.${err.data.currentStep}.${err.error}`),
					err,
				});
			}
		}
	}, [core, displayError]);

	return credentialOfferHandler;
}

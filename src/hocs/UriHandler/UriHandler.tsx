import React, { useEffect, useState, useContext, useMemo, useCallback } from "react";
import { OauthError } from "@wwwallet-private/client-core";
import { jsonToLog, logger } from "@/logger";
import { ProtocolData, ProtocolStep } from "./resources";

import SessionContext from "../../context/SessionContext";

import { useTranslation } from "react-i18next";
import useClientCore from "@/hooks/useClientCore";
import useErrorDialog from "@/hooks/useErrorDialog";

import {
	AuthorizationRequestHandler,
	AuthorizeHandler,
	CredentialRequestHandler,
	GeneratePresentationHandler,
	PresentationSuccessHandler,
	ProtocolErrorHandler
} from "./handlers";

type UriHandlerProps = {
	children: React.ReactNode;
}

export const UriHandler = (props: UriHandlerProps) => {
	const { children } = props

	const [ currentStep, setStep ] = useState<ProtocolStep>(null);
	const [ protocolData, setProtocolData ] = useState<ProtocolData>(null);

	const core = useClientCore();
	const { isLoggedIn } = useContext(SessionContext);
	const { displayError } = useErrorDialog();
	const { t } = useTranslation();

	useEffect(() => {
		if (!isLoggedIn) return

		core.location(window.location).then(presentationRequest => {
			if (presentationRequest.protocol) {
				goToStep(presentationRequest.nextStep, presentationRequest.data)
			}
		}).catch(err => {
			if (err instanceof OauthError) {
				logger.error(t(`errors.${err.error}`), jsonToLog(err));
				displayError({
					title: t(`errors.${err.error}`),
					emphasis: t(`errors.${err.data.protocol}.${err.data.currentStep}.description.${err.data.nextStep}`),
					description: t(`errors.${err.data.protocol}.${err.data.currentStep}.${err.error}`),
					err,
				});
			}
			else logger.error(err);
		})
	}, [isLoggedIn, core, displayError, t])

	const authorizationRequestStep = useMemo(() => {
		return currentStep === "authorization_request"
	}, [currentStep])

	const authorizeStep = useMemo(() => {
		return currentStep === "authorize"
	}, [currentStep])

	const credentialRequestStep = useMemo(() => {
		return currentStep === "credential_request"
	}, [currentStep])

	const presentationStep = useMemo(() => {
		return currentStep === "generate_presentation"
	}, [currentStep])

	const presentationSuccessStep = useMemo(() => {
		return currentStep === "presentation_success"
	}, [currentStep])

	const protocolErrorStep = useMemo(() => {
		return currentStep === "protocol_error"
	}, [currentStep])

	const goToStep = useCallback((step: ProtocolStep, data: ProtocolData) => {
		setStep(step)
		setProtocolData(data)
	}, [])

	return (
		<>
			{authorizationRequestStep &&
				<AuthorizationRequestHandler goToStep={goToStep} data={protocolData} />}
			{authorizeStep &&
				<AuthorizeHandler goToStep={goToStep} data={protocolData} />}
			{credentialRequestStep &&
				<CredentialRequestHandler goToStep={goToStep} data={protocolData} />}
			{presentationStep &&
				<GeneratePresentationHandler goToStep={goToStep} data={protocolData} />}
			{presentationSuccessStep &&
				<PresentationSuccessHandler goToStep={goToStep} data={protocolData} />}
			{protocolErrorStep &&
				<ProtocolErrorHandler goToStep={goToStep} data={protocolData} />}
			{children}
		</>
	);
}

export default UriHandler;

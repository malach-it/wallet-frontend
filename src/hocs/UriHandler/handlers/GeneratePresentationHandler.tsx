import { useTranslation } from "react-i18next";
import { DcqlQuery } from "dcql";
import React, { useContext, useEffect } from "react";
import { jsonToLog, logger } from "@/logger";
import { ProtocolData, ProtocolStep } from "../resources";

import CredentialsContext from "@/context/CredentialsContext";
import OpenID4VPContext from "@/context/OpenID4VPContext";

import useErrorDialog from "@/hooks/useErrorDialog";
import useClientCore from "@/hooks/useClientCore";
import { OauthError } from "@wwwallet-private/client-core";

type GeneratePresentationHandlerProps = {
	goToStep: (step: ProtocolStep, data: ProtocolData) => void
	data: any
}

export const GeneratePresentationHandler = ({ goToStep: _goToStep, data }: GeneratePresentationHandlerProps) => {
	const { presentation_request, dcql_query } = data;
	const { t } = useTranslation();
	const { openID4VP } = useContext(OpenID4VPContext);
	const { vcEntityList } = useContext(CredentialsContext);
	const { displayError } = useErrorDialog();
	const core = useClientCore();
	const u = new URL(window.location.href);

	const pathExists = (vcEntity: any, claims: DcqlQuery.Output["credentials"][0]["claims"]) => {
		return claims.some((claim: any) => {
			return getIn(vcEntity.parsedCredential.signedClaims, claim.path)
		})
	}

	function getIn(object: unknown, path: Array<string>): boolean {
		if (!path.length) return false

		const current = path.shift()

		if (!path.length) return !!object[current]

		Object.keys(object).some(key => {
			return getIn(object[key], [...path])
		})
	}

	useEffect(() => {
		if (!vcEntityList) return

		const credentials = vcEntityList.filter(vcEntity => {
			return dcql_query.credentials.some(credentialDefinition => {
				return (vcEntityList || []).some(vcEntity => {
					console.log(credentialDefinition.format)
					console.log(vcEntity.format)
					return pathExists(vcEntity, credentialDefinition.claims)
				})
			})
		})

		if (!credentials.length) {
			return displayError({
				title: t(`errors.invalid_request`),
				emphasis: t(`errors.oid4vp.generate_presentation.description.send_presentation`),
				description: t(`errors.oid4vp.generate_presentation.no_credential_match`),
			});
		}

		const verifierHostname = new URL(presentation_request.response_uri).hostname

		const jsonedMap = {}

		dcql_query.credentials.forEach((credential) => {
			jsonedMap[credential.id] = {
					credentials,
					requestedFields: credential.claims.map(({ path }) => {
						return {
							name: path.join("."),
							purpose: t('selectCredentialPopup.purposeNotSpecified'),
							path,
						}
					})
				}
			})

		console.log(vcEntityList);
		console.log("jsonedMap", jsonedMap);

		openID4VP.promptForCredentialSelection(
			jsonedMap,
			verifierHostname,
			t('selectCredentialPopup.purposeNotSpecified'),
		).then(selection => {
			const presentation_credentials = []
			selection.forEach((batchId, credential_id) => {
				presentation_credentials.push({
					credential_id,
					credential: vcEntityList.find(({ batchId: e }) => e === batchId).data,
					context: batchId,
				})
			})

			return core.generatePresentation({ presentation_credentials, presentation_request }).then(response => {
				return core.sendPresentation({
					presentation_request: response.data.presentation_request,
					vp_token: response.data.vp_token,
				}).then(response => {
					window.location.href = response.data.redirect_uri
				})
				// goToStep(response.nextStep, response.data)
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
		});
		// }).then((selection) => {
		// 	if (!(selection instanceof Map)) {
		// 		return;
		// 	}

		// 	logger.debug("Selection = ", selection);

		// 	return openID4VP.sendAuthorizationResponse(selection, vcEntityList);

		// }).then((res) => {
		// 	if (res && 'url' in res && res.url) {
		// 		window.location.href = res.url;
		// 	}
		// }).catch(err => {
		// 	logger.debug("Failed to handle authorization req");
		// 	window.history.replaceState({}, '', `${window.location.pathname}`);
		// 	logger.error(err);
		// })
	}, [vcEntityList])
	return (
		<></>
	)
}

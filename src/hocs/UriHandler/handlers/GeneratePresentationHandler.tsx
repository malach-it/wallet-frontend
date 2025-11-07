import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { DcqlQuery } from "dcql";
import React, { useContext, useEffect } from "react";
import { jsonToLog, logger } from "@/logger";
import { AppState } from "@/store";
import { ProtocolData, ProtocolStep } from "../resources";

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
	const vcEntityList = useSelector((state: AppState) => {
		return state.sessions.vcEntityList
	})
	const { displayError } = useErrorDialog();
	const core = useClientCore();

	const pathExists = (vcEntity: any, claims: DcqlQuery.Output["credentials"][0]["claims"]) => {
		return claims.some((claim: any) => {
			return getIn(vcEntity.parsedCredential.signedClaims, claim.path)
		})
	}

	function getIn(object: unknown, path: Array<string>): boolean {
		if (!path.length) return true

		const current = path.shift()

		if (!path.length) return !!object[current]

		Object.keys(object).some(key => {
			return getIn(object[key], [...path])
		})
	}

	useEffect(() => {
		if (!vcEntityList) return

		const credentials = vcEntityList.filter(vcEntity => {
			// TODO manage presentation definitions (not present in final specification)
			return dcql_query.credentials.some(credentialDefinition => {
				// TODO apply other filtering rules
				return (vcEntityList || []).some(vcEntity => {
					return pathExists(vcEntity, credentialDefinition.claims)
				})
			})
		})

		// TODO apply selective disclosure to presented credentials

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

			// TODO generate transaction data

			return core.generatePresentation({ presentation_credentials, presentation_request }).then(response => {
				// goToStep(response.nextStep, response.data)
				return core.sendPresentation({
					presentation_request: response.data.presentation_request,
					vp_token: response.data.vp_token,
				}).then(response => {
					// TODO store verifiable presentation
					// goToStep(response.nextStep, response.data)
					window.location.href = response.data.redirect_uri
				})
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
	}, [vcEntityList])
	return (
		<></>
	)
}

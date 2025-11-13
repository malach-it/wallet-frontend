import React, { useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { DcqlQuery } from "dcql";
import { SDJwt } from "@sd-jwt/core";
import { present } from "@sd-jwt/present";
import { jsonToLog, logger } from "@/logger";
import { AppState } from "@/store";
import { ProtocolData, ProtocolStep } from "../resources";

import OpenID4VPContext from "@/context/OpenID4VPContext";

import useErrorDialog from "@/hooks/useErrorDialog";
import useClientCore from "@/hooks/useClientCore";
import { OauthError } from "@wwwallet-private/client-core";

const hasher = (data: string | ArrayBuffer, alg: string) => {
	const encoded =
		typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);

	return crypto.subtle.digest(alg, encoded).then((v) => new Uint8Array(v));
}

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
		if (!path.length) return false
		const currentPath = [...path]

		const current = currentPath.shift()

		if (!currentPath.length) return !!object[current]

		return Object.keys(object).some(key => {
			if (key === current) {
				return getIn(object[key], currentPath)
			}
			return false
		})
	}

	function putIn(object: unknown, path: Array<string>, value: unknown): unknown {
		if (!path.length) return object
		const currentPath = [...path]

		const current = currentPath.shift()

		if (!currentPath.length) {
			object[current] = value
			return object
		}

		object[current] = putIn(object[current] || {}, currentPath, value)

		return object
	}

	useEffect(() => {
		if (!vcEntityList) return

		const credentials = vcEntityList.filter(vcEntity => {
			return dcql_query.credentials.some(credentialDefinition => {
				// TODO apply other filtering rules
				return pathExists(vcEntity, credentialDefinition.claims)
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

		openID4VP.promptForCredentialSelection(
			jsonedMap,
			verifierHostname,
			t('selectCredentialPopup.purposeNotSpecified'),
		).then(async selection => {
			const presentFrame = {}
			const claims = dcql_query.credentials.flatMap(({ claims }) => claims)
			claims.forEach(claim => {
				putIn(presentFrame, claim.path, true)
			})
			const disclosedCredentials = await Promise.all(credentials.map(async vcEntity => {
				const sdjwt = await SDJwt.fromEncode(vcEntity.data, hasher)
				return {
					vcEntity,
					credential: await present(vcEntity.data, presentFrame, hasher)
				}
			}))

			const presentation_credentials = []
			selection.forEach((batchId, credential_id) => {
				presentation_credentials.push({
					credential_id,
					credential: disclosedCredentials.find(({ vcEntity }) => vcEntity.batchId === batchId).credential,
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

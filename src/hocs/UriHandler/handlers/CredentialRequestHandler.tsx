import React, { useContext, useEffect, useState } from "react";
import { calculateJwkThumbprint, decodeJwt, JWK } from "jose";
import { OauthError } from "@wwwallet-private/client-core";
import { logger, jsonToLog } from "../../../logger";
import { WalletStateUtils } from "../../../services/WalletStateUtils";
import { ProtocolData, ProtocolStep } from "../resources";

import SessionContext from "@/context/SessionContext";

import { useTranslation } from "react-i18next";
import useClientCore from "@/hooks/useClientCore";
import useErrorDialog from "@/hooks/useErrorDialog";

import MessagePopup from "@/components/Popups/MessagePopup";

export type CredentialRequestProps = {
	goToStep: (step: ProtocolStep, data: ProtocolData) => void
	data: any
}

export const CredentialRequestHandler = ({ goToStep, data }) => {
	const {
		issuer_metadata,
		client_state: clientState,
		access_token,
		state,
		c_nonce
	} = data
	const { displayError } = useErrorDialog();
	const { api, keystore } = useContext(SessionContext);

	const { t } = useTranslation();
	const core = useClientCore();

	const credential_configuration_ids = clientState
			?.credential_configuration_ids || [];
	const audience = issuer_metadata.issuer;
	const issuer = core.config.static_clients.find(({ issuer }) => issuer === audience).client_id;

	useEffect(() => {
		(async () => {
			try {
				const [
					{ proof_jwts },
					proofsData,
					proofsCommit
				] = await keystore.generateOpenid4vciProofs(
					credential_configuration_ids.map(() => {
						return {
							nonce: c_nonce,
							audience,
							issuer,
						}
					})
				)
				// await api.updatePrivateData(proofsData);
				// await proofsCommit()

				// 	})()
				// }, [])

				// const requestCredentials = async () => {
				const credentials = await Promise.all(
					credential_configuration_ids.map(async (credential_configuration_id: string, index: number) => {
						const { data: { credentials } } = await core.credential({
							access_token,
							state,
							c_nonce,
							credential_configuration_id,
							proofs: {
								jwt: proof_jwts,
							},
						})

						return [credential_configuration_id, credentials]
					})
				)

				const batchId = WalletStateUtils.getRandomUint32();
				const [, credentialsData, credentialsCommit] = await keystore.addCredentials(
					await Promise.all(credentials
														.flatMap(([credential_configuration_id, credentials], index: number) => {
															return credentials.map(async ({ credential }) => {
																const { cnf }  = decodeJwt(credential) as { cnf: { jwk: JWK } };
																return {
																	data: credential,
																	format: "vc+sd-jwt",
																	kid: cnf && await calculateJwkThumbprint(cnf.jwk as JWK) || "",
																	credentialConfigurationId: credential_configuration_id,
																	credentialIssuerIdentifier: issuer_metadata.issuer,
																	batchId,
																	instanceId: index,
																}
															})
														}))
				)

				await api.updatePrivateData(credentialsData);
				await credentialsCommit();

				return true
			} catch(err) {
				if (err instanceof OauthError) {
					logger.error(t(`errors.invalid_client`), jsonToLog(err));
					displayError({
						title: t(`errors.invalid_client`),
						emphasis: t(`errors.oid4vci.credential_request.description.credential`),
						description: t(`errors.oid4vci.credential_request.invalid_client`),
						err,
					});
				} else {
					logger.error(err);
				}
			}
		})()
	}, [])

	return (
		<></>
		// <MessagePopup type="success" onClose={requestCredentials} message={{
		// 	title: "You are requesting credentials",
		// 	description: credential_configuration_ids.flatMap((credential_configuration_id: string) => {
		// 		return issuer_metadata
		// 			.credential_configurations_supported[credential_configuration_id]
		// 			.display.map(({ name }) => name)
		// 	}).join("<br />")
		// }} />
	)
}

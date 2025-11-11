import React, { useCallback, useContext, useEffect, useState } from "react";
import { calculateJwkThumbprint, decodeJwt, JWK } from "jose";
import { OauthError } from "@wwwallet-private/client-core";
import { OPENID4VCI_PROOF_TYPE_PRECEDENCE } from "@/config";
import { logger, jsonToLog } from "@/logger";
import { WalletStateUtils } from "@/services/WalletStateUtils";
import { ProtocolData, ProtocolStep } from "../resources";

import SessionContext from "@/context/SessionContext";

import { useTranslation } from "react-i18next";
import useClientCore from "@/hooks/useClientCore";
import useErrorDialog from "@/hooks/useErrorDialog";
import CredentialsContext from "@/context/CredentialsContext";

export type CredentialRequestProps = {
	goToStep: (step: ProtocolStep, data: ProtocolData) => void
	data: any
}

const configProofTypes = OPENID4VCI_PROOF_TYPE_PRECEDENCE.split(',') as string[];

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
	const { credentialEngine } = useContext<any>(CredentialsContext);

	const { t } = useTranslation();
	const core = useClientCore();

	const credential_configuration_ids = clientState
			?.credential_configuration_ids || [];
	const audience = issuer_metadata.issuer;
	const issuer = core.config.static_clients.find(({ issuer }) => issuer === audience).client_id;

	const requestKeyAttestation = useCallback(async (jwks: JWK[], nonce: string) => {
		try {
			const response = await api.post("/wallet-provider/key-attestation/generate", {
				jwks,
				openid4vci: {
					nonce: nonce,
				}
			});
			const { key_attestation } = response.data;
			if (!key_attestation || typeof key_attestation != 'string') {
				logger.debug("Cannot parse key_attestation from wallet-backend-server");
				return null;
			}
			return { key_attestation };
		}
		catch (err) {
			logger.debug(err);
			return null;
		}
	}, [api]
	);

	useEffect(() => {
		(async () => {
			try {
				const proofTypes = credential_configuration_ids.map(
					(credential_configuration_id: string) => {
						return configProofTypes.find(proofType => {
							return Object.keys(
								issuer_metadata
									.credential_configurations_supported[credential_configuration_id]
									?.proof_types_supported || {}
							).includes(proofType)
						})
					}
				).filter(proofType => proofType)

				const proofs: {
					jwt?: string[];
					attestation?: string[];
				}= {}

				if (proofTypes.filter(proofType => proofType === 'jwt').length) {
					const [
						{ proof_jwts },
						jwtProofsData,
						jwtProofsCommit
					] = await keystore.generateOpenid4vciProofs(
						proofTypes.filter(proofType => proofType === 'jwt').map(() => {
							return {
								nonce: c_nonce,
								audience,
								issuer,
							}
						})
					)

					// TODO commit jwt proof
					proofs.jwt = proof_jwts
				}

				if (proofTypes.filter(proofType => proofType === 'attestation').length) {
					const [{ keypairs }, attestationPublicKeys, attestationPublicKeysCommit] = await keystore.generateKeypairs(
						proofTypes.filter(proofType => proofType === 'attestation').length
					);

					const proof_attestation = await requestKeyAttestation(
						keypairs.map(({ publicKey }) => publicKey),
							c_nonce
					).then(({ key_attestation }) => key_attestation)

					// TODO commit attestation proof
					proofs.attestation = [proof_attestation]
				}

				const credentials = await Promise.all(
					credential_configuration_ids.map(async (credential_configuration_id: string, index: number) => {
						// TODO manage transaction data
						const { data: { credentials } } = await core.credential({
							access_token,
							state,
							credential_configuration_id,
							proofs,
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

								// TODO move credential validation in the core
								// TODO MSoMDoc issuer validation
								const isValid = await credentialEngine.credentialParsingEngine.parse({ rawCredential: credential })
								// TODO display validation warnings
								// TODO display consent if there are warnings
								if (!isValid.success) return

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
	)
}

import { calculateJwkThumbprint, decodeJwt, JWK } from "jose";
import { OauthError } from "@wwwallet-private/client-core";
import { HandlerHook, HandlerHookConfig, ProtocolStep } from "../resources";
import { logger, jsonToLog } from "../../../logger";
import { WalletStateUtils } from "../../../services/WalletStateUtils";
import { useCallback, useContext, useEffect, useState } from "react";
import SessionContext from "@/context/SessionContext";
import useClientCore from "@/hooks/useClientCore";
import { useTranslation } from "react-i18next";
import useErrorDialog from "@/hooks/useErrorDialog";

export function useCredentialRequestHandler({ goToStep, data }: HandlerHookConfig): HandlerHook {
	const { keystore, api } = useContext(SessionContext);
	const { t } = useTranslation();
	const core = useClientCore();
	const { displayError } = useErrorDialog();

	const [credentialsList, setCredentialsList] = useState([]);
	const [nextStep, setNextStep] = useState<ProtocolStep|null>(null);

	useEffect(() => {
		if (credentialsList.length < 1) return;
		(async () => {
				await core.config.clientStateStore.cleanupExpired();
				const [, credentialsData, credentialsCommit] = await keystore.addCredentials(credentialsList);
				await api.updatePrivateData(credentialsData);
				await credentialsCommit();

				if (nextStep) goToStep(nextStep, {});
		})();
	}, [credentialsList]);

	const credentialRequestHandler = useCallback(async (params: { access_token: string, state: string, c_nonce: string }) => {
		const clientState = await core.config.clientStateStore.fromState(params.state);

		const credentialConfigurationIds = clientState
				?.credential_configuration_ids || [];
		const audience = clientState.issuer;
		const issuer = core.config.static_clients.find(({ issuer }) => issuer === audience)?.client_id;

		try {
			const credentialsToBeAdded = [];
			for (const credentialConfigurationId of credentialConfigurationIds) {
				const [{ proof_jwts }, proofsContainer, proofsCommit] = await keystore.generateOpenid4vciProofs([{
					nonce: params.c_nonce,
					audience,
					issuer,
				}]);

				await api.updatePrivateData(proofsContainer);
				await proofsCommit()

				const { data: { credentials }, nextStep: nxtStp } = await core.credential({
					...params,
					credential_configuration_id: credentialConfigurationId,
					proofs: {
						jwt: proof_jwts,
					},
				});
				setNextStep(nxtStp);

				const batchId = WalletStateUtils.getRandomUint32();
				const creds = await Promise.all(credentials.map(async ({ credential, format }, index: number) => {
					const { cnf }  = decodeJwt(credential) as { cnf: { jwk: JWK } };
					const res = {
						data: credential,
						format,
						kid: cnf && await calculateJwkThumbprint(cnf.jwk as JWK) || "",
						credentialConfigurationId,
						credentialIssuerIdentifier: clientState.issuer,
						batchId,
						instanceId: index,
					}
					return res;
				}))

				credentialsToBeAdded.push(...creds)
			}
			setCredentialsList(credentialsToBeAdded);
		} catch(err) {
			if (err instanceof OauthError) {
				logger.error(t(`errors.${err.error}`), jsonToLog(err));
				displayError({
					title: t(`errors.${err.error}`),
					emphasis: t(`errors.${err.data.protocol}.${err.data.currentStep}.description.${err.data.nextStep}`),
					description: t(`errors.${err.data.protocol}.${err.data.currentStep}.${err.error}`),
					err,
				});
			} else {
				logger.error(err);
			}
		}
	}, [core, api, keystore]);

	return credentialRequestHandler;
}


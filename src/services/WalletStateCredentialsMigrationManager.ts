import { useEffect, useMemo, useRef, useCallback } from "react"
import { WalletStateCredential } from "./WalletStateSchemaVersion1";
import { LocalStorageKeystore } from "./LocalStorageKeystore";
import { BackendApi } from "@/api";
import { logger } from "@/logger";
import { deriveHolderKidFromCredential } from "@/lib/services/OpenID4VCI/OpenID4VCI";



export function useWalletStateCredentialsMigrationManager(keystore: LocalStorageKeystore, api: BackendApi, isOnline: boolean, isLoggedIn: boolean) {

	const migrated = useRef(false);
	const { getCalculatedWalletState, addCredentials } = keystore;
	const { get, del, updatePrivateData } = api;

	const migrateVerifiableCredentialTable = useCallback(async () => {

		if (!isLoggedIn || migrated.current || getCalculatedWalletState() === null) {
			return;
		}
		if (getCalculatedWalletState().credentials.length > 0) {
			migrated.current = true;
			return;
		}

		const response = await get('/storage/vc');
		const vcEntityList = response.data.vc_list;
		if (vcEntityList.length === 0) {
			migrated.current = true;
			return;
		}

		const stringToIdMap = new Map(); // assign a batchId for each credentialIdentifier
		let id = 0;
		for (const credentialIdentifier of vcEntityList.map((cred) => cred.credentialIdentifier)) {
			if (!stringToIdMap.has(credentialIdentifier)) {
				stringToIdMap.set(credentialIdentifier, id++);
			}
		}
		const transformedVcEntities: WalletStateCredential[] = await Promise.all(vcEntityList.map(async ({ credential, credentialIdentifier, credentialIssuerIdentifier, format, instanceId, }, index) => {
			return {
				data: credential,
				format: format,
				credentialIssuerIdentifier: credentialIssuerIdentifier,
				credentialConfigurationId: "",
				instanceId: instanceId,
				kid: await deriveHolderKidFromCredential(credential, format),
				batchId: stringToIdMap.get(credentialIdentifier),
				credentialId: index,
			}
		}));
		logger.debug("Transformed credentials = ", transformedVcEntities)
		const [, newPrivateData, keystoreCommit] = await addCredentials(transformedVcEntities);
		await updatePrivateData(newPrivateData);
		await keystoreCommit();
		migrated.current = true;
		logger.debug("Successfully migrated credentials");
		// receive all stored credentials from wallet-backend-server
		// update WalletStateContainer (PrivateData)
		// after successful update, delete all stored credentials from wallet-backend-server
	}, [isLoggedIn, getCalculatedWalletState, get, addCredentials, updatePrivateData]);

	useEffect(() => {
		if (updatePrivateData && addCredentials && getCalculatedWalletState && isOnline && !migrated.current) {
			migrateVerifiableCredentialTable();
			logger.debug("migrating credentials...")
		}
	}, [updatePrivateData, addCredentials, getCalculatedWalletState, isOnline, migrateVerifiableCredentialTable]);

	useEffect(() => {
		if (!migrated.current) {
			return;
		}
		get('/storage/vc').then(async (response) => {
			const vcEntityList = response.data.vc_list;
			try {
				await Promise.all(vcEntityList.map(async ({ credentialIdentifier }) => {
					try {
						await del('/storage/vc/' + credentialIdentifier);
						logger.debug("Deleted vc with identifier " + credentialIdentifier);
					}
					catch (err) {
						logger.debug("Failed to delete vc");
						logger.error(err);
						throw err;
					}
				}));
			}
			catch (err) {
				logger.error(err);
			}

		})
	}, [get, del, isOnline]);

	useEffect(() => {
		migrated.current = false;
	}, [isLoggedIn]);

	return useMemo(() => ({}), []);
}

import { useEffect, useMemo, useRef } from "react"
import { LocalStorageKeystore } from "./LocalStorageKeystore";
import { BackendApi } from "@/api";
import { logger } from "@/logger";



export function useWalletStateSettingsMigrationManager(keystore: LocalStorageKeystore, api: BackendApi, isOnline: boolean, isLoggedIn: boolean) {

	const migrated = useRef(false);
	const { getCalculatedWalletState, alterSettings } = keystore;
	const { updatePrivateData } = api;
	const migrate = async () => {
		logger.debug("Before")
		if (!isLoggedIn || migrated.current || getCalculatedWalletState() === null) {
			return;
		}

		if (getCalculatedWalletState().settings && Object.keys(getCalculatedWalletState().settings).length > 0) {
			migrated.current = true;
			return;
		}

		const response = await api.get('/user/session/account-info');

		const { settings } = response.data;
		logger.debug("Settings found = ", settings)
		if (!settings) {
			migrated.current = true;
			return;
		}

		const [{}, newPrivateData, keystoreCommit] = await alterSettings({ ...settings });
		await updatePrivateData(newPrivateData);
		await keystoreCommit();
		migrated.current = true;
		logger.debug("Successfully migrated settings");
		// receive all stored credentials from wallet-backend-server
		// update WalletStateContainer (PrivateData)
		// after successful update, delete all stored credentials from wallet-backend-server
	}

	useEffect(() => {
		if (isOnline && !migrated.current) {
			migrate();
			logger.debug("migrating settings...")
		}
	}, [getCalculatedWalletState, alterSettings, isOnline]);

	useEffect(() => {
		migrated.current = false;
	}, [isLoggedIn]);

	return useMemo(() => ({ }), []);
}

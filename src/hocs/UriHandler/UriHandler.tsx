import React, { useEffect, useState, useContext, useMemo, useCallback } from "react";
import { OauthError } from "@wwwallet-private/client-core";
import { useLocation } from "react-router-dom";
import { jsonToLog, logger } from "@/logger";
import StatusContext from "../../context/StatusContext";
import SessionContext from "../../context/SessionContext";
import { useTranslation } from "react-i18next";
import CredentialsContext from "@/context/CredentialsContext";
import { CachedUser } from "@/services/LocalStorageKeystore";
import SyncPopup from "@/components/Popups/SyncPopup";
import { useSessionStorage } from "@/hooks/useStorage";
import useClientCore from "@/hooks/useClientCore";
import useErrorDialog from "@/hooks/useErrorDialog";
import {
	AuthorizationRequestHandler,
	AuthorizeHandler,
	CredentialRequestHandler,
	PresentationHandler,
	PresentationSuccessHandler,
	ProtocolErrorHandler
} from "./handlers";
import { ProtocolData, ProtocolStep } from "./resources";

const PinInputPopup = React.lazy(() => import('../../components/Popups/PinInput'));

type UriHandlerProps = {
	children: React.ReactNode;
}

export const UriHandler = (props: UriHandlerProps) => {
	const { children } = props
	const { updateOnlineStatus, isOnline } = useContext(StatusContext);

	const { isLoggedIn, api, keystore, logout } = useContext(SessionContext);
	const { syncPrivateData } = api;
	const { getUserHandleB64u, getCachedUsers, getCalculatedWalletState } = keystore;

	const location = useLocation();
	const [url, setUrl] = useState(window.location.href);

	const core = useClientCore();
	const { displayError } = useErrorDialog();

	const [ currentStep, setStep ] = useState<ProtocolStep>(null);
	const [ protocolData, setProtocolData ] = useState<ProtocolData>(null);

	const [showPinInputPopup, setShowPinInputPopup] = useState<boolean>(false);

	const [showSyncPopup, setSyncPopup] = useState<boolean>(false);
	const [textSyncPopup, setTextSyncPopup] = useState<{ description: string }>({ description: "" });

	const { t } = useTranslation();

	const [redirectUri, setRedirectUri] = useState(null);
	const { vcEntityList } = useContext(CredentialsContext);

	const [cachedUser, setCachedUser] = useState<CachedUser | null>(null);
	const [synced, setSynced] = useState(false);
	const [latestIsOnlineStatus, setLatestIsOnlineStatus,] = api.useClearOnClearSession(useSessionStorage('latestIsOnlineStatus', null));

	useEffect(() => {
		if (!keystore || cachedUser !== null || !isLoggedIn) {
			return;
		}

		const userHandle = getUserHandleB64u();
		if (!userHandle) {
			return;
		}
		const u = getCachedUsers().filter((user) => user.userHandleB64u === userHandle)[0];
		if (u) {
			setCachedUser(u);
		}
	}, [getCachedUsers, getUserHandleB64u, setCachedUser, cachedUser, keystore, isLoggedIn]);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (window.location.search !== '' && params.get('sync') !== 'fail') {
			setSynced(false);
		}
	}, [location]);

	useEffect(() => {
		if (latestIsOnlineStatus === false && isOnline === true && cachedUser) {
			api.syncPrivateData(cachedUser);
		}
		if (isLoggedIn) {
			setLatestIsOnlineStatus(isOnline);
		} else {
			setLatestIsOnlineStatus(null);
		}
	}, [
		api,
		isLoggedIn,
		isOnline,
		latestIsOnlineStatus,
		setLatestIsOnlineStatus,
		cachedUser
	]);

	useEffect(() => {
		if (!getCalculatedWalletState || !cachedUser || !syncPrivateData) {
			return;
		}
		const params = new URLSearchParams(window.location.search);
		if (synced === false && getCalculatedWalletState() && params.get('sync') !== 'fail') {
			logger.debug("Actually syncing...");
			syncPrivateData(cachedUser).then((r) => {
				if (!r.ok) {
					return;
				}
				setSynced(true);
				// checkForUpdates();
				// updateOnlineStatus(false);
			});
		}

	}, [cachedUser, synced, setSynced, getCalculatedWalletState, syncPrivateData]);

	useEffect(() => {
		if (synced === true && window.location.search !== '') {
			setUrl(window.location.href);
		}
	}, [synced, setUrl, location]);

	useEffect(() => {
		if (redirectUri) {
			window.location.href = redirectUri;
		}
	}, [redirectUri]);

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

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (synced === true && params.get('sync') === 'fail') {
			setSynced(false);
		}
		else if (params.get('sync') === 'fail' && synced === false) {
			setTextSyncPopup({ description: 'syncPopup.description' });
			setSyncPopup(true);
		} else {
			setSyncPopup(false);
		}
	}, [location, t, synced]);

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
		return currentStep === "presentation"
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
				<PresentationHandler goToStep={goToStep} data={protocolData} />}
			{presentationSuccessStep &&
				<PresentationSuccessHandler goToStep={goToStep} data={protocolData} />}
			{protocolErrorStep &&
				<ProtocolErrorHandler goToStep={goToStep} data={protocolData} />}
			{children}
			{showPinInputPopup &&
				<PinInputPopup isOpen={showPinInputPopup} setIsOpen={setShowPinInputPopup} />
			}
			{showSyncPopup &&
				<SyncPopup message={textSyncPopup}
					onClose={() => {
						setSyncPopup(false);
						logout();
					}}
				/>
			}
		</>
	);
}

export default UriHandler;

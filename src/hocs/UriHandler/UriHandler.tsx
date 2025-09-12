import React, { useEffect, useState, useContext, useRef } from "react";
import { Core } from "@wwwallet-private/client-core";
import { useLocation } from "react-router-dom";
import checkForUpdates from "../../offlineUpdateSW";
import StatusContext from "../../context/StatusContext";
import SessionContext from "../../context/SessionContext";
import { useTranslation } from "react-i18next";
import { HandleAuthorizationRequestError } from "../../lib/interfaces/IOpenID4VP";
import OpenID4VCIContext from "../../context/OpenID4VCIContext";
import OpenID4VPContext from "../../context/OpenID4VPContext";
import CredentialsContext from "@/context/CredentialsContext";
import { CachedUser } from "@/services/LocalStorageKeystore";
import SyncPopup from "@/components/Popups/SyncPopup";
import { useSessionStorage } from "@/hooks/useStorage";
import { useOpenID4VCIHelper } from "@/lib/services/OpenID4VCIHelper";
import useClientCore from "@/hooks/useClientCore";
import { authorizeHandlerFactory, credentialOfferHandlerFactory, errorHandlerFactory, presentationHandlerFactory, presentationSuccessHandlerFactory } from "./handlers";
import { type StepHandlers } from "./resources";

const MessagePopup = React.lazy(() => import('../../components/Popups/MessagePopup'));
const PinInputPopup = React.lazy(() => import('../../components/Popups/PinInput'));

export const UriHandler = ({ children }) => {
	const { updateOnlineStatus, isOnline } = useContext(StatusContext);

	const [usedAuthorizationCodes, setUsedAuthorizationCodes] = useState<string[]>([]);
	const [usedRequestUris, setUsedRequestUris] = useState<string[]>([]);

	const { isLoggedIn, api, keystore, logout } = useContext(SessionContext);
	const { syncPrivateData } = api;
	const { getUserHandleB64u, getCachedUsers, getCalculatedWalletState } = keystore;

	const location = useLocation();
	const [url, setUrl] = useState(window.location.href);

	const { openID4VCI } = useContext(OpenID4VCIContext);
	const { openID4VP } = useContext(OpenID4VPContext);
	const openID4VCIHelper = useOpenID4VCIHelper();
	const core = useClientCore();

	const { handleCredentialOffer, generateAuthorizationRequest, handleAuthorizationResponse } = openID4VCI;
	const [showPinInputPopup, setShowPinInputPopup] = useState<boolean>(false);

	const [showSyncPopup, setSyncPopup] = useState<boolean>(false);
	const [textSyncPopup, setTextSyncPopup] = useState<{ description: string }>({ description: "" });

	const [showMessagePopup, setMessagePopup] = useState<boolean>(false);
	const [textMessagePopup, setTextMessagePopup] = useState<{ title: string, description: string }>({ title: "", description: "" });
	const [typeMessagePopup, setTypeMessagePopup] = useState<string>("");
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
	}, [getCachedUsers, getUserHandleB64u, setCachedUser, cachedUser, isLoggedIn]);

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
			console.log("Actually syncing...");
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
		if (!isLoggedIn || !url || !t || !openID4VCI || !openID4VP || !vcEntityList || !synced) {
			return;
		}

		const stepHandlers: StepHandlers = {
			"pushed_authorization_request": credentialOfferHandlerFactory({ core, url, openID4VCI, openID4VCIHelper }),
			"authorize": authorizeHandlerFactory({}),
			"presentation": presentationHandlerFactory({ core, url, openID4VP, vcEntityList, t, setUsedRequestUris, setMessagePopup, setTypeMessagePopup, setTextMessagePopup, setRedirectUri}),
			"presentation_success": presentationSuccessHandlerFactory({ url, openID4VCI, setUsedAuthorizationCodes }),
			"protocol_error": errorHandlerFactory({ url, isLoggedIn, setMessagePopup, setTypeMessagePopup, setTextMessagePopup}),
		}

		// Bind each handler to stepHandlers so `this` refers to stepHandlers
		for (const key in stepHandlers) {
			if (typeof stepHandlers[key] === "function") {
				stepHandlers[key] = stepHandlers[key].bind(stepHandlers);
			}
		}

		core.location(window.location).then(presentationRequest => {
			if (presentationRequest.protocol) {
				// @ts-expect-error
				stepHandlers[presentationRequest.nextStep](presentationRequest.data)
			}
		})


		// async function handle(urlToCheck: string) {
		// 	const u = new URL(urlToCheck);
		// 	if (u.searchParams.size === 0) return;
		// 	// setUrl(window.location.origin);
		// 	console.log('[Uri Handler]: check', url);

		// 	if (u.protocol === 'openid-credential-offer' || u.searchParams.get('credential_offer') || u.searchParams.get('credential_offer_uri')) {
		// 	}
		// 	else if (u.searchParams.get('code') && !usedAuthorizationCodes.includes(u.searchParams.get('code'))) {
		// 	}
		// 	else if (u.searchParams.get('client_id') && u.searchParams.get('request_uri') && !usedRequestUris.includes(u.searchParams.get('request_uri'))) {
		// 	}

		// }
		// handle(url);
	}, [url, t, isLoggedIn, setRedirectUri, vcEntityList, synced]);

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

	return (
		<>
			{children}
			{showPinInputPopup &&
				<PinInputPopup isOpen={showPinInputPopup} setIsOpen={setShowPinInputPopup} />
			}
			{showMessagePopup &&
				<MessagePopup type={typeMessagePopup} message={textMessagePopup} onClose={() => setMessagePopup(false)} />
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

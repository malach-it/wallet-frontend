import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import * as config from './config';
import { logger } from "./logger";

let messaging = null;

export const notificationApiIsSupported =
	'Notification' in window &&
	'serviceWorker' in navigator &&
	'PushManager' in window;

export async function isEnabledAndIsSupported() {
	return config.FIREBASE_ENABLED && await isSupported();
}

/** @param {ServiceWorkerRegistration} r */
async function postFirebaseConfigToWorker(r) {
	let worker = r.installing || r.active;

	worker.postMessage({ firebaseConfig: config.FIREBASE });
}

export async function register() {
	if (await isEnabledAndIsSupported() && 'serviceWorker' in navigator) {
		try {
			const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-cloud-messaging-push-scope');
			if (existingRegistration) {
				logger.debug('Service Worker is already registered. Scope:', existingRegistration.scope);
				postFirebaseConfigToWorker(existingRegistration);
			} else {
				const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/firebase-cloud-messaging-push-scope' });
				postFirebaseConfigToWorker(registration);
				logger.debug('App: Firebase Messaging Service Worker registered! Scope is:', registration.scope);
			}
		} catch (err) {
			logger.debug('App: Firebase Messaging Service Worker registration failed:', err);
		}
	} else {
		logger.debug('Service Workers are not supported in this browser.');
	}
};

const requestForToken = async () => {
	if (!await isEnabledAndIsSupported()) {
		return null;
	}
	if (messaging) {
		try {
			const currentToken = await getToken(messaging, { vapidKey: config.FIREBASE_VAPIDKEY });
			if (currentToken) {
				return currentToken;
			} else {
				logger.debug('No registration token available. Request permission to generate one.');
				return null;
			}
		} catch (err) {
			logger.debug('ERROR:', err.message, err.code);
			if (err.code === 'messaging/permission-blocked') {
				logger.error('Notification permission was blocked or click close.');
				return null;
			} else if (err.message === "Failed to execute 'subscribe' on 'PushManager': Subscription failed - no active Service Worker") {
				logger.error('Failed beacuse there is no token created yet, so we are going to re-register');

			} else {
				logger.error('An error occurred while retrieving token:', err);
				return null;
			}
		}
	} else {
		logger.debug('Messaging is not initialized.');
		return null;
	}
};

const reRegisterServiceWorkerAndGetToken = async () => {
	if (!await isEnabledAndIsSupported()) {
		return null;
	}
	if ('serviceWorker' in navigator) {
		try {
			// Re-register the service worker
			const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/firebase-cloud-messaging-push-scope' });
			if (registration) {
				postFirebaseConfigToWorker(registration);
				logger.debug('Service Worker re-registered', registration);
				const token = await requestForToken();
				if (token) {
					logger.debug('New FCM token obtained:', token);
					return token;
				} else {
					logger.debug('Failed to retrieve a new token.');
					return null;
				}
			} else {
				logger.debug('Service Worker re-registration failed');
			}
		} catch (error) {
			logger.error('Service Worker re-registration failed with', error);
		}
	} else {
		logger.debug('Service Workers are not supported in this browser.');
	}
};

export const fetchToken = async () => {
	if (await isEnabledAndIsSupported() && messaging) {
		const token = await requestForToken();
		if (token) {
			return token;
		} else {
			logger.debug('Failed to retrieve token. Trying to re-register service worker.');
			const newToken = await reRegisterServiceWorkerAndGetToken(); // Re-register service worker and fetch token
			if (newToken) {
				return newToken;
			} else {
				logger.debug('Failed to retrieve a new token after re-registration.');
			}
		}
	} else {
		logger.debug('Messaging is not initialized.');
	}
	return null; // Return null in case of failure
};

export const onMessageListener = async (callback) => {
	if (await isEnabledAndIsSupported()) {
		onMessage(messaging, (payload) => {
			callback(payload);
		});
	} else {
		logger.error('Messaging is not supported or enabled');
	}
};

const initializeFirebaseAndMessaging = async () => {
	if (notificationApiIsSupported) {
		let supported = await isEnabledAndIsSupported();
		if (supported) {
			initializeApp(config.FIREBASE);
			messaging = getMessaging();
			if (messaging) {
				logger.debug('Messaging is initialized.');
			} else {
				logger.debug('Messaging is not initialized.');
			}
		}
	}
};

initializeFirebaseAndMessaging();

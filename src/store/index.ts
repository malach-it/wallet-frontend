import { configureStore } from '@reduxjs/toolkit';
import statusReducer from "./statusSlice";
import sessionsReducer from "./sessionsSlice";

export const store = configureStore({
	reducer: {
		status: statusReducer,
		sessions: sessionsReducer,
	},
	middleware: (getDefaultMiddleware) => {
		return getDefaultMiddleware({
			serializableCheck: {
				ignoredActionPaths: [
					'payload',
				],
				ignoredPaths: [
					'sessions.keystore',
					'sessions.storage',
					'sessions.privateData',
					'sessions.calculatedWalletState',
					'sessions.api',
				],
			},
		})
	},
});

export { setOnline, setOffline, setPwaInstallable, setPwaNotInstallable } from "./statusSlice";
export {
	setKeystore,
	setPrivateData,
	setCalculatedWalletState,
	setStorageValue,
	setApi,
} from "./sessionsSlice";

export type AppState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

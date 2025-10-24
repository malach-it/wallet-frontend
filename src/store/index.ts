import { configureStore } from '@reduxjs/toolkit';
import statusReducer from "./statusSlice";
import sessionsReducer from "./sessionsSlice";

export const store = configureStore({
  reducer: {
		status: statusReducer,
		sessions: sessionsReducer,
	}
});

export { setOnline, setOffline, setPwaInstallable, setPwaNotInstallable } from "./statusSlice";
export { setKeystore, setApi } from "./sessionsSlice";

export type AppState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

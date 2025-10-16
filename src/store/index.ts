import { configureStore } from '@reduxjs/toolkit';
import statusReducer from "./statusSlice";

export const store = configureStore({
  reducer: {
		status: statusReducer,
	}
});

export { setOnline, setOffline, setPwaInstallable, setPwaNotInstallable } from "./statusSlice";

export type AppState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

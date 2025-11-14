import { createSlice } from "@reduxjs/toolkit";

export const statusSlice = createSlice({
	name: 'status',
	initialState: {
		isOnline: false,
		pwaInstallable: false
	},
	reducers: {
		setOnline: state => { state.isOnline = true },
			setOffline: state => { state.isOnline = false },
			setPwaInstallable: state => { state.pwaInstallable = true },
			setPwaNotInstallable: state => { state.pwaInstallable = false },
	}
});

export const {
	setOnline,
	setOffline,
	setPwaInstallable,
	setPwaNotInstallable,
} = statusSlice.actions;
export default statusSlice.reducer;

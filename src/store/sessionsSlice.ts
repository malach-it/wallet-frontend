import { BackendApi } from "@/api";
import { LocalStorageKeystore } from "@/services/LocalStorageKeystore";
import { createSlice } from "@reduxjs/toolkit";

type State = {
	keystore: LocalStorageKeystore | null;
	api: BackendApi
}

export const sessionsSlice = createSlice({
  name: 'status',
  initialState: {
		keystore: null,
		api: null,
	},
  reducers: {
		setKeystore: (state: State, { payload }: { payload: LocalStorageKeystore }) => {
			state.keystore = payload
		},
		setApi: (state: State, { payload }: { payload: BackendApi }) => {
			state.api = payload
		},
  }
});

export const {
	setKeystore,
	setApi,
} = sessionsSlice.actions;
export default sessionsSlice.reducer;

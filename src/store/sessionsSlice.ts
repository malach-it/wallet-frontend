import { BackendApi } from "@/api";
import { EncryptedContainer } from "@/services/keystore";
import { LocalStorageKeystore } from "@/services/LocalStorageKeystore";
import {WalletState} from "@/services/WalletStateSchemaCommon";
import { createSlice } from "@reduxjs/toolkit";

type State = {
	keystore: LocalStorageKeystore | null;
	privateData: EncryptedContainer | null;
	calculatedWalletState: WalletState | null;
	api: BackendApi | null;
	storage: {
		"Local storage": {
			currentValue: Record<string, unknown>;
		};
		"Session storage": {
			currentValue: Record<string, unknown>;
		};
	};
}

export const sessionsSlice = createSlice({
	name: 'status',
	initialState: {
		keystore: null,
		privateData: null,
		calculatedWalletState: null,
		storage: {
			"Local storage": {
				currentValue: {},
			},
			"Session storage": {
				currentValue: {},
			},
		},
		api: null,
	},
	reducers: {
		setKeystore: (state: State, { payload }: { payload: LocalStorageKeystore }) => {
			state.keystore = payload
		},
		setPrivateData: (state: State, { payload }: { payload: EncryptedContainer | null }) => {
			state.privateData = payload
		},
		setStorageValue: <T>(
			state: State,
			{ payload }: { payload: { type: "Local storage" | "Session storage", name: string, value: T } }
		) => {
			state.storage[payload.type].currentValue[payload.name] = payload.value
		},
		setCalculatedWalletState: (state: State, { payload }: { payload: WalletState | null }) => {
			state.calculatedWalletState = payload
		},
		setApi: (state: State, { payload }: { payload: BackendApi }) => {
			state.api = payload
		},
	}
});

export const {
	setKeystore,
	setPrivateData,
	setCalculatedWalletState,
	setStorageValue,
	setApi,
} = sessionsSlice.actions;
export default sessionsSlice.reducer;

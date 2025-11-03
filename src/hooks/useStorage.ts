import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { jsonParseTaggedBinary, jsonStringifyTaggedBinary } from '../util';
import { useDispatch, useSelector } from 'react-redux';
import { AppState, setStorageValue } from '@/store';
import { createSelector } from '@reduxjs/toolkit';

type ClearHandle = () => void;
export type UseStorageHandle<T> = [T, Dispatch<SetStateAction<T>>, ClearHandle];
type UseStorageEvent = { storageArea: Storage };
type SetValueEvent<T> = UseStorageEvent & { name: string, value: T };

function makeUseStorage<T>(
	storage: Storage,
	description: "Local storage" | "Session storage",
): (name: string, initialValue: T) => UseStorageHandle<T> {
	if (!storage) {
		throw new Error(`${description} is not available.`);
	}

	return (name: string, initialValue: T) => {
		const dispatch = useDispatch();

		const getCurrentValue = useCallback(
			() => {
				const storedValueStr = storage.getItem(name);
				try {
					if (storedValueStr !== null) {
						const value = jsonParseTaggedBinary(storedValueStr);
						return value;
					}
				} catch (e) {
					// Fall back to initValue
					storage.removeItem(name);
				}
				return initialValue;
			},
			[],
		);

		const currentValue = useSelector(createSelector(
			(state: AppState) => {
				return state.sessions.storage[description].currentValue;
			},
			(currentValue: unknown) => currentValue[name] || getCurrentValue()
		))

		const updateValue = useCallback(
			(action: SetStateAction<T>): void => {
				const newValue =
					action instanceof Function
					? action(getCurrentValue())
					: action;
				try {
					storage.setItem(name, jsonStringifyTaggedBinary(newValue));
				} catch (e) {
					console.error(`Failed to update storage "${name}"`, e);
				}
				window.dispatchEvent(
					new CustomEvent<SetValueEvent<T>>('useStorage.set', {
						detail: {
							storageArea: storage,
							name,
							value: newValue,
						},
					})
				);
			},
			[name],
		);

		const clearValue = useCallback(
			(): void => {
				try {
					storage.removeItem(name);
				} catch (e) {
					console.error(`Failed to remove storage "${name}"`, e);
				}
				window.dispatchEvent(
					new CustomEvent<SetValueEvent<T>>('useStorage.set', {
						detail: {
							storageArea: storage,
							name,
							value: getCurrentValue(),
						},
					})
				);
			},
			[name],
		);

		useEffect(
			() => {
				// Listen to storage events sent by the browser. These events are
				// triggered when the storage is changed in another tab, or when edited
				// manually by the user. Storage.setItem() and .removeItem() calls in
				// the same Document do not trigger these events, so we cannot use them
				// to synchronize state between useStorage hook instances.
				const listener = (event: StorageEvent) => {
					if (event.storageArea === storage) {
						if (event.key === name) { // Storage.setItem(name, value)
							dispatch(setStorageValue({ type: description, name, value: jsonParseTaggedBinary(event.newValue) }));

						} else if (event.key === null) { // Storage.clear()
							dispatch(setStorageValue({ type: description, name, value: null }));
						}
					}
				};
				window.addEventListener('storage', listener);

				return () => {
					window.removeEventListener('storage', listener);
				};
			},
			[name]
		);

		useEffect(
			() => {
				// Listen to synthetic events sent when a useStorage hook updates its
				// state. This causes all useStorage instances with the same name to
				// update their state, including the instance that caused the change.
				const listener = (event: CustomEvent<SetValueEvent<T>>) => {
					if (event.detail.storageArea === storage && event.detail.name === name) {
						dispatch(setStorageValue({ type: description, name, value: event.detail.value }));
					}
				};
				window.addEventListener('useStorage.set', listener);
				return () => {
					window.removeEventListener('useStorage.set', listener);
				};
			},
			[name],
		);

		return [currentValue, updateValue, clearValue];
	};
}

export const useLocalStorage: <T>(name: string, initialValue: T) => UseStorageHandle<T> =
	makeUseStorage(window.localStorage, "Local storage");

export const useSessionStorage: <T>(name: string, initialValue: T) => UseStorageHandle<T> =
	makeUseStorage(window.sessionStorage, "Session storage");

export const useClearStorages: (...clearHandles: ClearHandle[]) => ClearHandle =
	(...clearHandles: ClearHandle[]) => useCallback(
		() => {
			clearHandles.forEach(clear => clear());
		},
		[...clearHandles], // eslint-disable-line react-hooks/exhaustive-deps -- Arrays are not stable under Object.is, so we have to use spread operator here
	);

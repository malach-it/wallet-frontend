import { useCallback, useContext } from "react";
import SessionContext from "@/context/SessionContext";
import { HandlerHook, HandlerHookConfig } from "../resources";
import useErrorDialog from "@/hooks/useErrorDialog";

export function useErrorHandler(config: HandlerHookConfig): HandlerHook {
	const { isLoggedIn } = useContext(SessionContext);
	const { displayError } = useErrorDialog();

	const url = window.location.toString();

	return useCallback(async () => {
		const urlParams = new URLSearchParams(window.location.search);
		const state = urlParams.get('state');
		const error = urlParams.get('error');

		if (url && isLoggedIn && state && error) {
			window.history.replaceState({}, '', `${window.location.pathname}`);
			const errorDescription = urlParams.get('error_description');
			displayError({ title: error, description: errorDescription })
		}
	}, [url, isLoggedIn, displayError]);
}

import React, { useContext } from "react";
import { ProtocolData, ProtocolStep } from "../resources";

import SessionContext from "@/context/SessionContext";

import useErrorDialog from "@/hooks/useErrorDialog";

export type ProtocolErrorHandlerProps = {
	goToStep: (step: ProtocolStep, data: ProtocolData) => void;
	data: any;
}

export const ProtocolErrorHandler = ({ goToStep, data }) => {
	const { isLoggedIn } = useContext(SessionContext);
	const { displayError } = useErrorDialog();

	const urlParams = new URLSearchParams(window.location.search);
	const state = urlParams.get('state');
	const error = urlParams.get('error');

	if (isLoggedIn && state && error) {
		window.history.replaceState({}, '', `${window.location.pathname}`);
		const errorDescription = urlParams.get('error_description');
		displayError({ title: error, description: errorDescription })
	}

	return (
		<></>
	)
}

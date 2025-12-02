import React, { useEffect } from "react";
import { ProtocolData, ProtocolStep } from "../resources";

import MessagePopup from "@/components/Popups/MessagePopup";

export type ProtocolErrorHandlerProps = {
	goToStep: (step: ProtocolStep, data: ProtocolData) => void;
	data: any;
}

export const ProtocolErrorHandler = ({ goToStep, data }) => {
	const { error, error_description } = data

	// TODO verify authorization response state
	// const state = urlParams.get('state');

	useEffect(() => {
		window.history.replaceState({}, '', `${window.location.pathname}`);
	}, [])

	return (
		<>
			<MessagePopup type="error" onClose={() => {}} message={{
				title: error,
				description: error_description,
			}} />
		</>
	)
}

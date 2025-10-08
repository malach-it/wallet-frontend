import React, { useContext } from "react";
import { logger } from "@/logger";
import { ProtocolData, ProtocolStep } from "../resources";

import OpenID4VCIContext from "@/context/OpenID4VCIContext";

export type PresentationSuccessProps = {
	goToStep: (step: ProtocolStep, data: ProtocolData) => void;
	data: any;
}

export const PresentationSuccessHandler = ({ goToStep: _goToStep, data: _data }) => {
	const { openID4VCI } = useContext(OpenID4VCIContext);

	const u = new URL(window.location.href);

	logger.debug("Handling authorization response...");
	openID4VCI.handleAuthorizationResponse(u.toString()).catch(err => {
		logger.error("Error during the handling of authorization response", err);
		window.history.replaceState({}, '', `${window.location.pathname}`);
	})

	return (
		<></>
	)
}

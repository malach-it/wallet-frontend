import { ProtocolData, ProtocolStep } from "../resources";

type AuthorizeHandlerProps = {
	goToStep: (step: ProtocolStep, data: ProtocolData) => void;
	data: any;
}

export const AuthorizeHandler = ({ data }: AuthorizeHandlerProps) => {
	const { authorize_url } = data

	window.location.href = authorize_url

	return (
		<></>
	)
}

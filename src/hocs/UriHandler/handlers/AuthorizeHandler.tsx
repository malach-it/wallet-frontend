type AuthorizeHandlerProps = {
	goToStep: (step: string, data: any) => void;
	data: {
		authorize_url: string;
	};
}

export const AuthorizeHandler = ({ data }: AuthorizeHandlerProps) => {
	const { authorize_url } = data

	window.location.href = authorize_url

	return (
		<></>
	)
}

import { useContext } from 'react';
import ErrorDialogContext, { ErrorDialogContextParams } from '@/context/ErrorDialogContext';

export default function useErrorDialog(): ErrorDialogContextParams {
	const ErrorDialog = useContext(ErrorDialogContext);

	if (!ErrorDialog) {
		throw new Error(
			'useErrorDialog must be used within a <ErrorDialogContextProvider>'
		);
	}

	return ErrorDialog;
}

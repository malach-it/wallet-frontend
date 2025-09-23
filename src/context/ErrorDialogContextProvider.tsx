import React, { useCallback, useState } from 'react';
import ErrorDialogContext, { ErrorDialogState } from './ErrorDialogContext';
import MessagePopup from '@/components/Popups/MessagePopup';

type ErrorDialogContextProviderProps = {
	children: React.ReactNode;
};

export const ErrorDialogContextProvider = ({ children }: ErrorDialogContextProviderProps) => {
	const [error, displayError] = useState<ErrorDialogState|null>()

	const clearError = useCallback(() => {
		displayError(null);
	}, [displayError]);

	const onClose = () => {
		clearError();
		if (typeof error.onClose === "function") {
			error.onClose();
		}
	};

	return (
		<ErrorDialogContext.Provider value={{ error, displayError, clearError }}>
			{children}
			{error && (
				<MessagePopup type="error" onClose={onClose} message={{
					title: error.title,
					emphasis: error.emphasis,
					description: error.description,
				}} />
			)}
		</ErrorDialogContext.Provider>
	);
};

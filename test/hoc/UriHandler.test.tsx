import React from 'react';
import { Provider as StateProvider } from 'react-redux';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setLoggedIn, setOnline, store } from '../../src/store';

import { ClientCoreContextProvider } from '../../src/context/ClientCoreContextProvider';
import { ErrorDialogContextProvider } from '../../src/context/ErrorDialogContextProvider';
import { StatusContextProvider } from '../../src/context/StatusContextProvider';
import UriHandler from '../../src/hocs/UriHandler/UriHandler';

const subject = (
		<StateProvider store={store}>
			<ErrorDialogContextProvider>
				<StatusContextProvider>
					<ClientCoreContextProvider>
						<UriHandler children={<a data-testid="content">content</a>} />
					</ClientCoreContextProvider>
				</StatusContextProvider>
			</ErrorDialogContextProvider>
		</StateProvider>
)

describe("UriHandler", () => {
	beforeEach(() => {
		vi.stubGlobal("navigator", {
			serviceWorker: {
				addEventListener: () => {}
			}
		})
	})

	it('renders without location parameters', () => {
		render(subject)

		return waitFor(() => {
			const content = screen.getByTestId("content") as HTMLElement

			expect(content.innerHTML).to.eq("content")
		})
	})

	describe("wallet is online", () => {
		beforeEach(() => {
			store.dispatch(setOnline())
		})

		it('renders without location parameters', () => {
			render(subject)

			return waitFor(() => {
				const content = screen.getByTestId("content") as HTMLElement

				expect(content.innerHTML).to.eq("content")
			})
		})

		describe("user is logged in", () => {
			beforeEach(() => {
				store.dispatch(setLoggedIn(true))
			})

			it("renders protocol errors", () => {
				const error = "oauth_error"
				const error_description = "oauth_error_description"
				vi.stubGlobal("location", {
					search: `?error=${error}&error_description=${error_description}`
				})
				render(subject)

				return waitFor(() => {
					const content = screen.getByTestId("content") as HTMLElement
					expect(content.innerHTML).to.eq("content")

					screen.getByText(error) as HTMLElement
					screen.getByText(error_description) as HTMLElement
				})
			})
		})
	})
})

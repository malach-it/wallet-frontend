import nock from 'nock';
import React from 'react';
import { Provider as StateProvider } from 'react-redux';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
	afterEach(() => {
		nock.cleanAll()
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
			nock("http://backend.test")
				.persist()
				.get("/status")
				.reply(200, {})
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

			it('renders without location parameters', () => {
				render(subject)

				return waitFor(() => {
					const content = screen.getByTestId("content") as HTMLElement

					expect(content.innerHTML).to.eq("content")
				})
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

			it("renders credential offer errors", () => {
				const credential_offer = {}
				vi.stubGlobal("location", {
					search: `?credential_offer=${JSON.stringify(credential_offer)}`
				})
				render(subject)

				return waitFor(() => {
					const content = screen.getByTestId("content") as HTMLElement
					expect(content.innerHTML).to.eq("content")

					screen.getByText("errors.oid4vci.parse_location.description.authorization_request") as HTMLElement
					screen.getByText("errors.oid4vci.parse_location.invalid_location") as HTMLElement
				})
			})

			it("redirects to authorization url with a valid credential offer", () => {
				nock("http://backend.test")
					.persist()
					.post("/proxy", () => true)
					.reply(200, (_url, body: { url: string }) => {
						const pushed_authorization_request_endpoint = "http://issuer.test/par"
						if (body.url === pushed_authorization_request_endpoint) {
							return {
								data: {
									request_uri: "request_uri",
								},
							}
						}

						if (body.url.match(/well-known/)) {
							return {
								data: {
									authorization_endpoint: "http://issuer.test/authorize",
									pushed_authorization_request_endpoint,
									credential_configurations_supported: {},
									request_uri: "request_uri",
								},
							}
						}
					})

				const credential_issuer = "http://issuer.test"
				const credential_configuration_ids = ["credential_configuration_ids"]
				const grants = { authorization_code: {} }
				const credential_offer = {
					credential_issuer,
					credential_configuration_ids,
					grants,
				}
				vi.stubGlobal("location", {
					search: `?credential_offer=${JSON.stringify(credential_offer)}`,
					set href(value) {
						expect(value).to.eq("http://issuer.test/authorize?client_id=client_id&request_uri=request_uri")
					}
				})

				render(subject)

				return waitFor(() => {
					const content = screen.getByTestId("content") as HTMLElement
					expect(content.innerHTML).to.eq("content")

					screen.getByText("redirected") as HTMLElement
				})
			})
		})
	})
})

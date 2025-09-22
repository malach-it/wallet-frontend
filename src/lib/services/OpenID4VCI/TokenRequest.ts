import { useCallback, useRef, useMemo } from 'react';
import { JWK, KeyLike } from 'jose';
import { logger } from '@/logger';
import { useHttpProxy } from '../HttpProxy/HttpProxy';
import { generateDPoP } from '../../utils/dpop';

export type AccessToken = {
	access_token: string;
	c_nonce: string;
	expires_in: number;
	c_nonce_expires_in: number;
	refresh_token?: string;

	httpResponseHeaders: {
		"dpop-nonce"?: string;
	};
};

export enum GrantType {
	AUTHORIZATION_CODE = "code",
	REFRESH = "refresh_token",
}

export enum TokenRequestError {
	FAILED,
	AUTHORIZATION_REQUIRED,
}

export function useTokenRequest() {
	const httpProxy = useHttpProxy();

	const tokenEndpointURL = useRef<string | null>(null);
	const grantType = useRef<GrantType>(GrantType.AUTHORIZATION_CODE);
	const refreshToken = useRef<string | null>(null);
	const authorizationCode = useRef<string | null>(null);
	const codeVerifier = useRef<string | null>(null);
	const redirectUri = useRef<string | null>(null);
	const clientId = useRef<string | null>(null);
	const retries = useRef<number>(0);
	const dpopParams = useRef<{ dpopPrivateKey: KeyLike, dpopPublicKeyJwk: JWK, jti: string } | null>(null);


	const httpHeaders = useRef<Map<string, string>>(new Map([
		['Content-Type', 'application/x-www-form-urlencoded']
	]));


	const setClientId = useCallback((clientIdValue: string) => {
		clientId.current = clientIdValue;
	}, []);

	const setGrantType = useCallback((grant: GrantType) => {
		grantType.current = grant;
	}, []);

	const setAuthorizationCode = useCallback((authzCode: string) => {
		authorizationCode.current = authzCode;
	}, []);

	const setCodeVerifier = useCallback((codeVerifierValue: string) => {
		codeVerifier.current = codeVerifierValue;
	}, []);

	const setRefreshToken = useCallback((token: string) => {
		refreshToken.current = token;
	}, []);

	const setRedirectUri = useCallback((uri: string) => {
		redirectUri.current = uri;
	}, []);

	const setTokenEndpoint = useCallback((endpoint: string) => {
		tokenEndpointURL.current = endpoint;
	}, []);

	const setDpopHeader = useCallback(async (
		dpopPrivateKey: KeyLike,
		dpopPublicKeyJwk: JWK,
		jti: string
	) => {
		if (!tokenEndpointURL.current) {
			throw new Error("tokenEndpointURL was not defined");
		}
		dpopParams.current = { dpopPrivateKey, dpopPublicKeyJwk, jti };
		const dpop = await generateDPoP(
			dpopPrivateKey,
			dpopPublicKeyJwk,
			"POST",
			tokenEndpointURL.current,
			httpHeaders.current.get('dpop-nonce')
		);
		httpHeaders.current.set('DPoP', dpop);
	}, [httpHeaders]);

	const execute = useCallback(async (): Promise<
		{ response: AccessToken } | { error: TokenRequestError; response?: any }
	> => {
		const formData = new URLSearchParams();

		if (!clientId.current || !redirectUri.current) {
			throw new Error("Client ID or Redirect URI is not set");
		}

		formData.append('client_id', clientId.current);

		if (grantType.current === GrantType.AUTHORIZATION_CODE) {
			if (!authorizationCode.current || !codeVerifier.current) {
				throw new Error("Authorization Code or Code Verifier is not set");
			}

			formData.append('grant_type', 'authorization_code');
			formData.append('code', authorizationCode.current);
			formData.append('code_verifier', codeVerifier.current);
		} else if (grantType.current === GrantType.REFRESH) {
			if (!refreshToken.current) {
				throw new Error("Refresh Token is not set");
			}

			formData.append('grant_type', 'refresh_token');
			formData.append('refresh_token', refreshToken.current);
		} else {
			throw new Error("Invalid grant type selected");
		}

		formData.append('redirect_uri', redirectUri.current);

		logger.debug("Token endpoint headers to send = ", Object.fromEntries(httpHeaders.current))
		const response = await httpProxy.post(
			tokenEndpointURL.current!,
			formData.toString(),
			Object.fromEntries(httpHeaders.current)
		);

		if (response.status !== 200) {

			logger.error("Failed token request");

			if (response.headers?.['dpop-nonce'] && retries.current < 1) {
				logger.debug("Response headers = ", response.headers)
				retries.current = retries.current + 1;
				httpHeaders.current.set('dpop-nonce', response.headers['dpop-nonce']);
				const { dpopPrivateKey, dpopPublicKeyJwk, jti } = dpopParams.current;
				await setDpopHeader(dpopPrivateKey, dpopPublicKeyJwk, jti);
				return execute();
			}

			if (response?.data?.["error"] === "authorization_required") {
				return { error: TokenRequestError.AUTHORIZATION_REQUIRED, response: response?.data };
			}

			return { error: TokenRequestError.FAILED };
		}

		return {
			response: {
				access_token: response.data?.["access_token"],
				c_nonce: response.data?.["c_nonce"],
				c_nonce_expires_in: response.data?.["c_nonce_expires_in"],
				expires_in: response.data?.["expires_in"],
				refresh_token: response.data?.["refresh_token"],
				httpResponseHeaders: {
					...response.headers,
				},
			},
		};
	}, [httpProxy, httpHeaders]);

	return useMemo(() => ({
		setClientId,
		setGrantType,
		setAuthorizationCode,
		setCodeVerifier,
		setRefreshToken,
		setRedirectUri,
		setTokenEndpoint,
		setDpopHeader,
		execute,
	}), [
		setClientId,
		setGrantType,
		setAuthorizationCode,
		setCodeVerifier,
		setRefreshToken,
		setRedirectUri,
		setTokenEndpoint,
		setDpopHeader,
		execute,
	]);
}

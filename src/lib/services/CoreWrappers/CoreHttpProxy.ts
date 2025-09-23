import { useHttpProxy } from "../HttpProxy/HttpProxy";

export function useCoreHttpProxy() {
	const httpProxy = useHttpProxy();

	return {
		get: async <T>(url: string) => {
			const response = await httpProxy.get(url);

			if (!response) {
				throw new Error("No reponse from http proxy");
			}

			if (String(response.status).startsWith("4")) {
				throw new Error(JSON.stringify(response.data));
			}

			if (String(response.status).startsWith("5")) {
				throw new Error(JSON.stringify(response.data));
			}

			return {
				data: response.data as T
			};
		},

		post: async <T>(url: string, body: any, config: any) => {
			// Figure out how this should be done, search params or object...
			const response = await httpProxy.post(url, body, config.headers);

			if (!response) {
				throw new Error("No reponse from http proxy");
			}

			if (String(response.status).startsWith("4")) {
				throw new Error(JSON.stringify(response.data));
			}

			if (String(response.status).startsWith("5")) {
				throw new Error(JSON.stringify(response.data));
			}

			return {
				data: response.data as T
			};
		}
	}
}

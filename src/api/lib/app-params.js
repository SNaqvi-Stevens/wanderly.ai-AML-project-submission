const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false, skipStorage = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		// skipStorage: use the value this session only, don't write to localStorage
		if (!skipStorage) {
			storage.setItem(storageKey, searchParam);
		}
		return searchParam;
	}
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
	if (isNode) {
		return {
			appId: undefined,
			token: undefined,
			fromUrl: undefined,
			functionsVersion: undefined,
			appBaseUrl: undefined,
		};
	}

	const urlParams = new URLSearchParams(window.location.search);
	const tokenFromUrl = urlParams.get('access_token');

	// If a token arrived via URL param (builder preview injection), it must NOT be
	// persisted to localStorage. Remove any previously stored URL-injected token
	// so it can never leak to other users visiting the published URL.
	if (tokenFromUrl) {
		storage.removeItem('base44_access_token');
	}

	if (getAppParamValue("clear_access_token") === 'true') {
		storage.removeItem('base44_access_token');
		storage.removeItem('token');
	}

	return {
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
		// URL-param token: use for this session only, never write to localStorage
		token: getAppParamValue("access_token", { removeFromUrl: true, skipStorage: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
	}
}


export const appParams = {
	...getAppParams()
}
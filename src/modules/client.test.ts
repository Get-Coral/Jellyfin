import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { JellyfinClient } from "./client.js";

const client = new JellyfinClient({ url: "http://jellyfin.local/", apiKey: "key", userId: "user" });

function sentHeaders(fetchMock: ReturnType<typeof vi.fn>): Headers {
	const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
	return new Headers(init.headers);
}

describe("fetchRaw", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("keeps caller headers passed as a Headers object", async () => {
		const fetchMock = vi.fn(async () => new Response(null));
		vi.stubGlobal("fetch", fetchMock);

		await client.fetchRaw("/Items", { headers: new Headers({ Range: "bytes=0-" }) });

		const headers = sentHeaders(fetchMock);
		expect(headers.get("range")).toBe("bytes=0-");
		expect(headers.get("authorization")).toContain('Token="key"');
	});

	it("lets caller headers override the auth header", async () => {
		const fetchMock = vi.fn(async () => new Response(null));
		vi.stubGlobal("fetch", fetchMock);

		await client.fetchRaw("/Items", { headers: [["Authorization", "custom"]] });

		expect(sentHeaders(fetchMock).get("authorization")).toBe("custom");
	});
});

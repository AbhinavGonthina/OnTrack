import { afterEach, describe, expect, test, vi } from "vitest";
import { cachedFetch, invalidateCache } from "./requestCache";

describe("requestCache", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("returns the cached value without calling the fetcher again within the TTL", async () => {
    const fetcher = vi.fn().mockResolvedValue("value");

    const first = await cachedFetch("key-a", fetcher);
    const second = await cachedFetch("key-a", fetcher);

    expect(first).toBe("value");
    expect(second).toBe("value");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test("calls the fetcher again once the TTL has expired", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValue("value");

    await cachedFetch("key-b", fetcher);
    vi.advanceTimersByTime(16_000);
    await cachedFetch("key-b", fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  test("calls the fetcher again after invalidateCache", async () => {
    const fetcher = vi.fn().mockResolvedValue("value");

    await cachedFetch("key-c", fetcher);
    invalidateCache("key-c");
    await cachedFetch("key-c", fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  test("does not cache a failed fetch - the next call retries", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("network error")).mockResolvedValue("value");

    await expect(cachedFetch("key-d", fetcher)).rejects.toThrow("network error");
    const result = await cachedFetch("key-d", fetcher);

    expect(result).toBe("value");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  test("keeps different keys independent", async () => {
    const fetcherA = vi.fn().mockResolvedValue("a");
    const fetcherB = vi.fn().mockResolvedValue("b");

    invalidateCache("key-e", "key-f");
    const a = await cachedFetch("key-e", fetcherA);
    const b = await cachedFetch("key-f", fetcherB);

    expect(a).toBe("a");
    expect(b).toBe("b");
  });
});

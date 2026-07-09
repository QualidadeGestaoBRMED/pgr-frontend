import { afterEach, describe, expect, it, vi } from "vitest";
import { apiPost, ApiError } from "./api";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiPost error handling", () => {
  it("propaga o campo `code` do corpo JSON de erro em ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(503, {
          code: "HEAVY_GENERATION_IN_PROGRESS",
          message: "Ja existe um documento com anexos grandes sendo gerado.",
          details: [{ error_type: "heavy_generation_in_progress" }],
        })
      )
    );

    await expect(apiPost("/api/v1/frontend/pgr/1/external-export/pdf/start")).rejects.toMatchObject(
      {
        name: "ApiError",
        status: 503,
        code: "HEAVY_GENERATION_IN_PROGRESS",
      }
    );
  });

  it("mantem `code` undefined quando o corpo de erro nao tem esse campo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(503, { message: "Capacidade esgotada." }))
    );

    try {
      await apiPost("/api/v1/frontend/pgr/1/external-export/pdf/start");
      throw new Error("deveria ter lancado ApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBeUndefined();
      expect((error as ApiError).status).toBe(503);
    }
  });

  it("resolve normalmente quando a resposta e 2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(202, { jobId: "abc123" }))
    );

    const result = await apiPost<{ jobId: string }>(
      "/api/v1/frontend/pgr/1/external-export/pdf/start"
    );

    expect(result.jobId).toBe("abc123");
  });
});

import type { PartnerJob, PartnerTopic, SeedSource } from "./types.js";

export type { PartnerJob, PartnerTopic, SeedSource } from "./types.js";

type FetchLike = typeof fetch;

interface Envelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export class PartnerApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
    readonly details: unknown = null,
  ) {
    super(message);
    this.name = "PartnerApiError";
  }
}

export class PartnerClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly apiKey: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async request<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<T> {
    if (!this.apiKey) throw new Error("VERISTRATA_API_KEY is required");
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        authorization: `Bearer ${this.apiKey}`,
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
    const payload = await response.json().catch(() => ({})) as {
      data?: T;
      error?: { code?: string; message?: string; details?: unknown };
    };
    if (!response.ok) {
      throw new PartnerApiError(
        payload.error?.message || `Partner API request failed with ${response.status}`,
        response.status,
        payload.error?.code || null,
        payload.error?.details,
      );
    }
    return (payload as Envelope<T>).data;
  }

  createTopic(input: {
    title: string;
    description?: string;
    partner_external_id?: string;
    location_label?: string;
    seed_sources?: SeedSource[];
  }): Promise<PartnerTopic> {
    return this.request<PartnerTopic>("/topics", { method: "POST", body: JSON.stringify(input) });
  }

  listTopics(query = ""): Promise<Record<string, unknown>> { return this.request(`/topics${query}`); }
  getTopic(topicId: string): Promise<PartnerTopic> { return this.request(`/topics/${encodeURIComponent(topicId)}`); }

  addSource(topicId: string, source: SeedSource): Promise<Record<string, unknown>> {
    return this.request(`/topics/${encodeURIComponent(topicId)}/sources`, {
      method: "POST",
      body: JSON.stringify(source),
    });
  }

  attachCanonicalCase(topicId: string, input: unknown) { return this.post(`/topics/${this.id(topicId)}/case`, input); }

  prepareTopic(topicId: string): Promise<PartnerJob> {
    return this.request(`/topics/${encodeURIComponent(topicId)}/prepare`, { method: "POST" });
  }

  getJob(topicId: string, jobId: string): Promise<PartnerJob> {
    return this.request(`/topics/${encodeURIComponent(topicId)}/jobs/${encodeURIComponent(jobId)}`);
  }

  getReviewWorkspace(topicId: string): Promise<Record<string, unknown>> {
    return this.request(`/topics/${encodeURIComponent(topicId)}/review-workspace`);
  }

  reviewFramedClaims(topicId: string, input: unknown) { return this.post(`/topics/${this.id(topicId)}/review`, input); }
  startSelectedEvidence(topicId: string, input: unknown) { return this.post(`/topics/${this.id(topicId)}/evidence-start`, input); }
  cancelTopicEvidence(topicId: string, input: unknown = {}) { return this.post(`/topics/${this.id(topicId)}/evidence-cancel`, input); }
  getEvidenceReview(topicId: string) { return this.request(`/topics/${this.id(topicId)}/evidence-review`); }
  reviewEvidenceRelationship(topicId: string, relationshipId: string, input: unknown) {
    return this.post(`/topics/${this.id(topicId)}/evidence-relationships/${this.id(relationshipId)}/review`, input);
  }
  finishEvidenceReview(topicId: string, input: unknown = {}) { return this.post(`/topics/${this.id(topicId)}/review-finish`, input); }
  listTopicReleases(topicId: string) { return this.request(`/topics/${this.id(topicId)}/releases`); }
  publishTopicRelease(topicId: string, input: unknown) { return this.post(`/topics/${this.id(topicId)}/releases`, input); }
  getTopicRelease(topicId: string, releaseId: string) { return this.request(`/topics/${this.id(topicId)}/releases/${this.id(releaseId)}`); }

  getPanel(topicId: string): Promise<Record<string, unknown>> {
    return this.request(`/topics/${encodeURIComponent(topicId)}/panel`);
  }

  listTopicClaims(topicId: string) { return this.request(`/topics/${this.id(topicId)}/claims`); }
  getTopicVeriMeter(topicId: string) { return this.request(`/topics/${this.id(topicId)}/verimeter`); }
  getClaimEvidence(claimId: string) { return this.request(`/claims/${this.id(claimId)}/evidence`); }
  getTopicHandoff(topicId: string) { return this.request(`/topics/${this.id(topicId)}/handoff`); }
  createTopicContribution(topicId: string, input: unknown) { return this.post(`/topics/${this.id(topicId)}/contributions`, input); }

  private id(value: string) { return encodeURIComponent(value); }
  private post(path: string, input: unknown) {
    return this.request(path, { method: "POST", body: JSON.stringify(input) });
  }
}

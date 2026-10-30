import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, post } from "./services/api";

type Hypothesis = { hypothesis_id: string; text: string; status?: string };
type Relationship = {
  relationship_id: number | string;
  stance?: string;
  rationale?: string | null;
  quote?: string | null;
  review_status?: string;
  source?: { title?: string | null; url?: string | null; publisher_name?: string | null };
};
type EvidenceClaim = {
  claim_id: number | string;
  text: string;
  featured?: Record<string, Relationship[]>;
  reviewed?: { approved?: Relationship[]; rejected?: Relationship[] };
};
type CaseSnapshot = {
  assessment: { assessment_id: string; state: string; created_at: string } | null;
  topic: { topic_id: string; title: string; state: string } | null;
  workspace: { inquiry?: { hypotheses?: Hypothesis[]; evidence_runs?: Array<{ status?: string }> } } | null;
  evidence_review: { claims?: EvidenceClaim[] } | null;
  panel: {
    title?: string;
    state?: string;
    verimeter?: { topic_score?: number | null; not_available_reason?: string | null; claim_coverage?: { rated?: number; eligible?: number } };
    claims?: Array<{ claim_id: number | string; text: string; verimeter_score?: number | null; review_status?: string }>;
  } | null;
};

function stateLabel(value?: string | null) {
  return (value || "waiting").replaceAll("_", " ");
}

function relationshipList(claim: EvidenceClaim) {
  const featured = Object.values(claim.featured || {}).flat();
  const reviewed = [...(claim.reviewed?.approved || []), ...(claim.reviewed?.rejected || [])];
  const byId = new Map<string, Relationship>();
  [...featured, ...reviewed].forEach((item) => byId.set(String(item.relationship_id), item));
  return [...byId.values()];
}

export function CaseLauncher() {
  const [inquiry, setInquiry] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const run = async () => {
    setError("");
    setLoading(true);
    try {
      const snapshot = await post<CaseSnapshot>("/api/cases", { inquiry: inquiry.trim() });
      if (!snapshot.assessment?.assessment_id) throw new Error("The inquiry was created without a review identifier");
      navigate(`/cases/${snapshot.assessment.assessment_id}`);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };
  return <div className="panel case-launcher">
    <div className="panel-title"><h2>Start an evidence inquiry</h2><span className="badge green">GUIDED WORKFLOW</span></div>
    <label className="field-label" htmlFor="case-inquiry">What should VeriStrata investigate?</label>
    <textarea id="case-inquiry" value={inquiry} onChange={(event)=>setInquiry(event.target.value)} placeholder="What evidence supports or contradicts the claim that…"/>
    <button disabled={loading || inquiry.trim().length < 10} onClick={run}>{loading ? "Building hypotheses…" : "Build hypotheses"}</button>
    <p className="fine">The inquiry is the research question. Sources are discovered by the evidence workflow after you approve the hypotheses.</p>
    {error && <div className="notice warn">{error}</div>}
  </div>;
}

export function CaseWorkspace() {
  const { assessmentId = "" } = useParams();
  const [snapshot, setSnapshot] = useState<CaseSnapshot | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const hypotheses = snapshot?.workspace?.inquiry?.hypotheses || [];
  const evidenceClaims = snapshot?.evidence_review?.claims || [];
  const relationships = useMemo(() => evidenceClaims.flatMap(relationshipList), [evidenceClaims]);
  const approvedCount = relationships.filter((item)=>item.review_status === "approved").length;
  const activeRuns = (snapshot?.workspace?.inquiry?.evidence_runs || []).filter((run)=>["queued","running"].includes(run.status || "")).length;
  const published = snapshot?.panel?.state === "published" || snapshot?.topic?.state === "published";

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const value = await api<CaseSnapshot>(`/api/cases/${assessmentId}`);
      setSnapshot(value);
      if (selected.size === 0) setSelected(new Set((value.workspace?.inquiry?.hypotheses || []).filter((item)=>item.status !== "rejected").map((item)=>item.hypothesis_id)));
    } catch (cause) { setError((cause as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [assessmentId]);

  const startEvidence = async () => {
    const selections = hypotheses.filter((item)=>selected.has(item.hypothesis_id)).map((item)=>({ hypothesis_id:item.hypothesis_id, text:item.text }));
    setLoading(true); setError("");
    try { setSnapshot(await post<CaseSnapshot>(`/api/cases/${assessmentId}/evidence-start`, { selections })); }
    catch (cause) { setError((cause as Error).message); }
    finally { setLoading(false); }
  };
  const reviewRelationship = async (relationshipId: number | string, action: "approve" | "reject") => {
    setLoading(true); setError("");
    try { setSnapshot(await post<CaseSnapshot>(`/api/cases/${assessmentId}/evidence/${relationshipId}/review`, { action })); }
    catch (cause) { setError((cause as Error).message); }
    finally { setLoading(false); }
  };
  const finish = async () => {
    setLoading(true); setError("");
    try { setSnapshot(await post<CaseSnapshot>(`/api/cases/${assessmentId}/finish`, {})); }
    catch (cause) { setError((cause as Error).message); }
    finally { setLoading(false); }
  };

  if (!snapshot && loading) return <div className="panel"><p>Loading case…</p></div>;
  return <div className="case-workspace">
    <header className="case-header">
      <div><p className="eyebrow">Evidence case</p><h2>{snapshot?.topic?.title || "Inquiry"}</h2></div>
      <div><span className="badge">{stateLabel(snapshot?.topic?.state)}</span><button onClick={load} disabled={loading}>Refresh</button></div>
    </header>
    {error && <div className="notice warn">{error}</div>}

    <section className="case-step">
      <div className="step-number">1</div><div className="step-content"><h3>Review hypotheses</h3>
      {hypotheses.length ? <><p>Select the questions that should be sent to the evidence engine.</p><div className="hypothesis-list">{hypotheses.map((item)=><label key={item.hypothesis_id}><input type="checkbox" checked={selected.has(item.hypothesis_id)} disabled={item.status === "accepted" || activeRuns > 0 || relationships.length > 0} onChange={(event)=>setSelected((current)=>{const next=new Set(current);event.target.checked?next.add(item.hypothesis_id):next.delete(item.hypothesis_id);return next;})}/><span>{item.text}</span><small>{item.status || "proposed"}</small></label>)}</div>{!published && relationships.length === 0 && activeRuns === 0 && <button onClick={startEvidence} disabled={loading || selected.size === 0}>Approve selected and collect evidence</button>}</> : <p>Hypotheses are still being prepared. Refresh shortly.</p>}</div>
    </section>

    <section className="case-step">
      <div className="step-number">2</div><div className="step-content"><h3>Review evidence</h3>
      {activeRuns > 0 && <div className="notice">Evidence collection is running for {activeRuns} approved {activeRuns === 1 ? "hypothesis" : "hypotheses"}. Refresh to check progress.</div>}
      {evidenceClaims.length ? <div className="evidence-claims">{evidenceClaims.map((claim)=><article key={claim.claim_id}><h4>{claim.text}</h4>{relationshipList(claim).map((relationship)=><div className="evidence-item" key={relationship.relationship_id}><div><span className={`stance ${relationship.stance || ""}`}>{relationship.stance || "evidence"}</span><strong>{relationship.source?.title || relationship.source?.publisher_name || "Source"}</strong></div>{relationship.quote && <blockquote>{relationship.quote}</blockquote>}{relationship.rationale && <p>{relationship.rationale}</p>}{relationship.source?.url && <a href={relationship.source.url} target="_blank" rel="noreferrer">View source</a>}<div className="review-actions"><span>{relationship.review_status || "proposed"}</span><button disabled={loading || relationship.review_status === "approved"} onClick={()=>reviewRelationship(relationship.relationship_id,"approve")}>Approve</button><button className="secondary" disabled={loading || relationship.review_status === "rejected"} onClick={()=>reviewRelationship(relationship.relationship_id,"reject")}>Reject</button></div></div>)}</article>)}</div> : activeRuns === 0 && <p>No evidence is ready yet. Approve hypotheses above, then refresh after collection finishes.</p>}
      </div>
    </section>

    <section className="case-step">
      <div className="step-number">3</div><div className="step-content"><h3>Finish and score</h3>
      {published ? <div className="verimeter-result"><strong>{snapshot?.panel?.verimeter?.topic_score ?? "—"}</strong><span>VeriMeter</span><p>{snapshot?.panel?.verimeter?.claim_coverage?.rated || 0} of {snapshot?.panel?.verimeter?.claim_coverage?.eligible || 0} eligible claims rated</p></div> : <><p>Only approved evidence contributes to the published VeriMeter.</p><button onClick={finish} disabled={loading || approvedCount === 0 || activeRuns > 0}>Finish review and calculate VeriMeter</button>{approvedCount === 0 && <p className="fine">Approve at least one evidence relationship first.</p>}</>}
      {snapshot?.panel?.claims?.length ? <div className="claim-scores">{snapshot.panel.claims.map((claim)=><article key={claim.claim_id}><span>{claim.verimeter_score ?? "—"}</span><p>{claim.text}</p></article>)}</div> : null}</div>
    </section>
    <details className="technical-details"><summary>Technical details</summary><pre className="json">{JSON.stringify(snapshot,null,2)}</pre></details>
  </div>;
}

CREATE TABLE IF NOT EXISTS ai_tool_assessments (
  assessment_id CHAR(36) PRIMARY KEY,
  tool_name VARCHAR(64) NOT NULL,
  external_id VARCHAR(255) NULL,
  partner_topic_id VARCHAR(128) NULL,
  partner_job_id VARCHAR(128) NULL,
  state VARCHAR(32) NOT NULL,
  methodology_version VARCHAR(32) NOT NULL,
  request_json JSON NOT NULL,
  result_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_assessments_tool_created (tool_name, created_at),
  INDEX idx_assessments_partner_topic (partner_topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_tool_corpus_documents (
  assessment_id CHAR(36) NOT NULL,
  document_id VARCHAR(128) NOT NULL,
  source_url TEXT NULL,
  content_sha256 CHAR(64) NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (assessment_id, document_id),
  CONSTRAINT fk_ai_corpus_assessment FOREIGN KEY (assessment_id)
    REFERENCES ai_tool_assessments (assessment_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_tool_assessment_access (
  assessment_id CHAR(36) PRIMARY KEY,
  key_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_assessment_access_key (key_id, created_at),
  CONSTRAINT fk_assessment_access_assessment FOREIGN KEY (assessment_id)
    REFERENCES ai_tool_assessments (assessment_id) ON DELETE CASCADE,
  CONSTRAINT fk_assessment_access_key FOREIGN KEY (key_id)
    REFERENCES ai_tool_access_keys (key_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

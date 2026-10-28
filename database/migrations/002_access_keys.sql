CREATE TABLE IF NOT EXISTS ai_tool_access_keys (
  key_id CHAR(36) PRIMARY KEY,
  key_prefix VARCHAR(24) NOT NULL,
  key_hash CHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  scopes_json JSON NOT NULL,
  allowed_tools_json JSON NOT NULL,
  status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
  requests_per_minute INT UNSIGNED NOT NULL DEFAULT 60,
  monthly_quota INT UNSIGNED NULL DEFAULT 10000,
  requests_this_month INT UNSIGNED NOT NULL DEFAULT 0,
  usage_month CHAR(7) NULL,
  monthly_investigation_quota INT UNSIGNED NOT NULL DEFAULT 10,
  investigations_this_month INT UNSIGNED NOT NULL DEFAULT 0,
  investigation_month CHAR(7) NULL,
  max_concurrent_investigations SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  expires_at TIMESTAMP NULL,
  last_used_at TIMESTAMP NULL,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_access_keys_status (status),
  INDEX idx_access_keys_prefix (key_prefix)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_tool_usage_events (
  event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  key_id CHAR(36) NOT NULL,
  method VARCHAR(12) NOT NULL,
  path VARCHAR(512) NOT NULL,
  status_code SMALLINT UNSIGNED NOT NULL,
  duration_ms INT UNSIGNED NOT NULL,
  request_id VARCHAR(128) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_usage_key_created (key_id, created_at),
  CONSTRAINT fk_usage_access_key FOREIGN KEY (key_id)
    REFERENCES ai_tool_access_keys (key_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

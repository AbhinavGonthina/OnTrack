ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE auth_tokens (
    id            UUID PRIMARY KEY,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash    VARCHAR(64) NOT NULL,
    token_type    VARCHAR(20) NOT NULL
        CHECK (token_type IN ('EMAIL_VERIFICATION','PASSWORD_RESET')),
    expires_at    TIMESTAMP NOT NULL,
    consumed_at   TIMESTAMP,
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_auth_tokens_hash ON auth_tokens(token_hash);
CREATE INDEX idx_auth_tokens_user_type ON auth_tokens(user_id, token_type);

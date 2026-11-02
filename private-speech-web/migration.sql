CREATE TABLE IF NOT EXISTS app_user_profiles (
  id bigserial PRIMARY KEY,
  auth0_sub text NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT '',
  locale text NOT NULL DEFAULT 'en-AU',
  consent jsonb NOT NULL DEFAULT '{"personalAdaptation":true,"cameraProcessing":false,"cloudProcessing":false,"federatedLearning":false,"researchUse":false,"persistentVoiceEmbedding":false}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE app_user_profiles IS 'Adtunis profile and consent settings only. No raw speech, audio or video.';

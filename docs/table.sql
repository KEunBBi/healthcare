-- ============================================================
-- Healthcare 프로젝트 DB 스키마 (PostgreSQL)
-- 출처: docs/DATA_MODEL.md 1장 (DB 스키마 - ERD)
-- 테이블 생성 순서: 참조 대상(users, disease_codes) 먼저 생성
-- ============================================================

-- ------------------------------------------------------------
-- 1.1 회원관리테이블 (User)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id     VARCHAR(20)  NOT NULL,
    password    VARCHAR(200) NOT NULL,
    name        VARCHAR(50)  NOT NULL,
    gender      VARCHAR(1)   NOT NULL,
    birth_date  VARCHAR(8)   NOT NULL,
    user_type   VARCHAR(4)   NOT NULL,
    api_key     VARCHAR(50),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_users PRIMARY KEY (user_id),
    CONSTRAINT ck_users_gender CHECK (gender IN ('M', 'F'))
);
COMMENT ON TABLE users IS '회원관리테이블';
COMMENT ON COLUMN users.user_id IS '회원ID';
COMMENT ON COLUMN users.password IS '암호';
COMMENT ON COLUMN users.name IS '회원명';
COMMENT ON COLUMN users.gender IS '성별';
COMMENT ON COLUMN users.birth_date IS '생년월일 (YYYYMMDD)';
COMMENT ON COLUMN users.user_type IS '회원유형';
COMMENT ON COLUMN users.api_key IS '시뮬레이터 인증용 API Key';
COMMENT ON COLUMN users.created_at IS '등록일';
COMMENT ON COLUMN users.updated_at IS '수정일';

-- ------------------------------------------------------------
-- 1.2 질병코드테이블 (DiseaseCode)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS disease_codes (
    disease_id   VARCHAR(20)  NOT NULL,
    name_en      VARCHAR(100) NOT NULL,
    name_kr      VARCHAR(100) NOT NULL,
    category     VARCHAR(50),
    severity     VARCHAR(20),
    description  VARCHAR(512),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_disease_codes PRIMARY KEY (disease_id)
);
COMMENT ON TABLE disease_codes IS '질병코드테이블';
COMMENT ON COLUMN disease_codes.disease_id IS '질병ID';
COMMENT ON COLUMN disease_codes.name_en IS '질병명(영어)';
COMMENT ON COLUMN disease_codes.name_kr IS '질병명(한글)';
COMMENT ON COLUMN disease_codes.category IS '질병카테고리';
COMMENT ON COLUMN disease_codes.severity IS '중증도';
COMMENT ON COLUMN disease_codes.description IS '질병설명';
COMMENT ON COLUMN disease_codes.created_at IS '등록일';
COMMENT ON COLUMN disease_codes.updated_at IS '수정일';

-- ------------------------------------------------------------
-- 1.3 회원-질병관리테이블 (UserDisease)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_diseases (
    diagnosis_seq     BIGSERIAL    NOT NULL,
    user_id           VARCHAR(20)  NOT NULL,
    disease_id        VARCHAR(20)  NOT NULL,
    diagnosis_detail  VARCHAR(512),
    diagnosed_at      TIMESTAMPTZ  NOT NULL,
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_diseases PRIMARY KEY (diagnosis_seq),
    CONSTRAINT fk_user_diseases_user FOREIGN KEY (user_id) REFERENCES users (user_id),
    CONSTRAINT fk_user_diseases_disease FOREIGN KEY (disease_id) REFERENCES disease_codes (disease_id)
);
COMMENT ON TABLE user_diseases IS '회원-질병관리테이블';
COMMENT ON COLUMN user_diseases.diagnosis_seq IS '진단시퀀스번호';
COMMENT ON COLUMN user_diseases.user_id IS '회원ID (FK)';
COMMENT ON COLUMN user_diseases.disease_id IS '질병ID (FK)';
COMMENT ON COLUMN user_diseases.diagnosis_detail IS '진단내용';
COMMENT ON COLUMN user_diseases.diagnosed_at IS '진단일';
COMMENT ON COLUMN user_diseases.updated_at IS '수정일';

CREATE INDEX IF NOT EXISTS ix_user_diseases_user_id ON user_diseases (user_id);
CREATE INDEX IF NOT EXISTS ix_user_diseases_disease_id ON user_diseases (disease_id);

-- ------------------------------------------------------------
-- 1.4 회원-심박정보테이블 (UserHeartRate)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_heart_rates (
    seq          BIGSERIAL    NOT NULL,
    user_id      VARCHAR(20)  NOT NULL,
    heart_rate   INTEGER      NOT NULL,
    status       VARCHAR(200),
    note         VARCHAR(200),
    measured_at  TIMESTAMPTZ  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_heart_rates PRIMARY KEY (seq),
    CONSTRAINT fk_user_heart_rates_user FOREIGN KEY (user_id) REFERENCES users (user_id)
);
COMMENT ON TABLE user_heart_rates IS '회원-심박정보테이블';
COMMENT ON COLUMN user_heart_rates.seq IS '시퀀스번호';
COMMENT ON COLUMN user_heart_rates.user_id IS '회원ID (FK)';
COMMENT ON COLUMN user_heart_rates.heart_rate IS '심박수(bpm)';
COMMENT ON COLUMN user_heart_rates.status IS '상태';
COMMENT ON COLUMN user_heart_rates.note IS '비고';
COMMENT ON COLUMN user_heart_rates.measured_at IS '측정일시';
COMMENT ON COLUMN user_heart_rates.created_at IS '생성일시';

CREATE INDEX IF NOT EXISTS ix_user_heart_rates_user_measured ON user_heart_rates (user_id, measured_at);

-- ------------------------------------------------------------
-- 1.5 회원-혈압정보테이블 (UserBloodPressure)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_blood_pressures (
    seq          BIGSERIAL    NOT NULL,
    user_id      VARCHAR(20)  NOT NULL,
    systolic     INTEGER      NOT NULL,
    diastolic    INTEGER      NOT NULL,
    status       VARCHAR(200),
    note         VARCHAR(200),
    measured_at  TIMESTAMPTZ  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_blood_pressures PRIMARY KEY (seq),
    CONSTRAINT fk_user_blood_pressures_user FOREIGN KEY (user_id) REFERENCES users (user_id)
);
COMMENT ON TABLE user_blood_pressures IS '회원-혈압정보테이블';
COMMENT ON COLUMN user_blood_pressures.seq IS '시퀀스번호';
COMMENT ON COLUMN user_blood_pressures.user_id IS '회원ID (FK)';
COMMENT ON COLUMN user_blood_pressures.systolic IS '수축기(mmHg)';
COMMENT ON COLUMN user_blood_pressures.diastolic IS '이완기(mmHg)';
COMMENT ON COLUMN user_blood_pressures.status IS '상태';
COMMENT ON COLUMN user_blood_pressures.note IS '비고';
COMMENT ON COLUMN user_blood_pressures.measured_at IS '측정일시';
COMMENT ON COLUMN user_blood_pressures.created_at IS '생성일시';

CREATE INDEX IF NOT EXISTS ix_user_blood_pressures_user_measured ON user_blood_pressures (user_id, measured_at);

-- ------------------------------------------------------------
-- 1.6 회원-체중관리테이블 (UserBodyRecord)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_body_records (
    seq                      BIGSERIAL     NOT NULL,
    user_id                  VARCHAR(20)   NOT NULL,
    weight_kg                NUMERIC(5,2)  NOT NULL,
    bmi                      NUMERIC(4,1)  NOT NULL,
    skeletal_muscle_mass_kg  NUMERIC(5,2),
    body_fat_percentage      NUMERIC(4,1),
    status                   VARCHAR(100),
    note                     VARCHAR(200),
    measured_at              TIMESTAMPTZ   NOT NULL,
    created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_body_records PRIMARY KEY (seq),
    CONSTRAINT fk_user_body_records_user FOREIGN KEY (user_id) REFERENCES users (user_id)
);
COMMENT ON TABLE user_body_records IS '회원-체중관리테이블';
COMMENT ON COLUMN user_body_records.seq IS '시퀀스번호';
COMMENT ON COLUMN user_body_records.user_id IS '회원ID (FK)';
COMMENT ON COLUMN user_body_records.weight_kg IS '체중(kg)';
COMMENT ON COLUMN user_body_records.bmi IS 'BMI';
COMMENT ON COLUMN user_body_records.skeletal_muscle_mass_kg IS '골격근량(kg)';
COMMENT ON COLUMN user_body_records.body_fat_percentage IS '체지방률(%)';
COMMENT ON COLUMN user_body_records.status IS '상태';
COMMENT ON COLUMN user_body_records.note IS '비고';
COMMENT ON COLUMN user_body_records.measured_at IS '측정일시';
COMMENT ON COLUMN user_body_records.created_at IS '생성일시';

CREATE INDEX IF NOT EXISTS ix_user_body_records_user_measured ON user_body_records (user_id, measured_at);

-- ------------------------------------------------------------
-- 1.7 회원-혈당정보테이블 (UserGlucose)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_glucoses (
    seq            BIGSERIAL    NOT NULL,
    user_id        VARCHAR(20)  NOT NULL,
    glucose_mg_dl  INTEGER      NOT NULL,
    status         VARCHAR(100),
    note           VARCHAR(200),
    measured_at    TIMESTAMPTZ  NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_glucoses PRIMARY KEY (seq),
    CONSTRAINT fk_user_glucoses_user FOREIGN KEY (user_id) REFERENCES users (user_id),
    CONSTRAINT ck_user_glucoses_status CHECK (status IS NULL OR status IN ('normal', 'elevated', 'high'))
);
COMMENT ON TABLE user_glucoses IS '회원-혈당정보테이블';
COMMENT ON COLUMN user_glucoses.seq IS '시퀀스번호';
COMMENT ON COLUMN user_glucoses.user_id IS '회원ID (FK)';
COMMENT ON COLUMN user_glucoses.glucose_mg_dl IS '혈당값(mg/dL)';
COMMENT ON COLUMN user_glucoses.status IS '상태 (normal/elevated/high)';
COMMENT ON COLUMN user_glucoses.note IS '비고';
COMMENT ON COLUMN user_glucoses.measured_at IS '측정일시';
COMMENT ON COLUMN user_glucoses.created_at IS '생성일시';

CREATE INDEX IF NOT EXISTS ix_user_glucoses_user_measured ON user_glucoses (user_id, measured_at);

-- ------------------------------------------------------------
-- 1.8 회원-걸음수정보테이블 (UserStepCount)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_step_counts (
    seq          BIGSERIAL    NOT NULL,
    user_id      VARCHAR(20)  NOT NULL,
    step_count   INTEGER      NOT NULL,
    measured_at  TIMESTAMPTZ  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_step_counts PRIMARY KEY (seq),
    CONSTRAINT fk_user_step_counts_user FOREIGN KEY (user_id) REFERENCES users (user_id)
);
COMMENT ON TABLE user_step_counts IS '회원-걸음수정보테이블';
COMMENT ON COLUMN user_step_counts.seq IS '시퀀스번호';
COMMENT ON COLUMN user_step_counts.user_id IS '회원ID (FK)';
COMMENT ON COLUMN user_step_counts.step_count IS '누적걸음수';
COMMENT ON COLUMN user_step_counts.measured_at IS '측정일시';
COMMENT ON COLUMN user_step_counts.created_at IS '생성일시';

CREATE INDEX IF NOT EXISTS ix_user_step_counts_user_measured ON user_step_counts (user_id, measured_at);

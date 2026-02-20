-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "subscription_level" TEXT NOT NULL DEFAULT 'free',
    "learning_preferences" TEXT DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" DATETIME
);

-- CreateTable
CREATE TABLE "vocabulary_lists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source_file_name" TEXT,
    "source_file_url" TEXT,
    "total_words" INTEGER NOT NULL DEFAULT 0,
    "hsk_distribution" TEXT DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vocabulary_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vocabulary_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vocabulary_list_id" TEXT NOT NULL,
    "simplified" TEXT NOT NULL,
    "traditional" TEXT,
    "pinyin" TEXT,
    "english_definitions" TEXT NOT NULL,
    "hsk_level" INTEGER,
    "frequency_score" REAL NOT NULL DEFAULT 0,
    "part_of_speech" TEXT,
    "example_sentences" TEXT NOT NULL DEFAULT '[]',
    "user_notes" TEXT,
    "mastery_level" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vocabulary_items_vocabulary_list_id_fkey" FOREIGN KEY ("vocabulary_list_id") REFERENCES "vocabulary_lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "generated_stories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "vocabulary_list_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "story_type" TEXT NOT NULL DEFAULT 'narrative',
    "difficulty_level" TEXT NOT NULL DEFAULT 'intermediate',
    "content" TEXT NOT NULL,
    "vocabulary_used" TEXT NOT NULL DEFAULT '[]',
    "regeneration_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "generated_stories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "generated_stories_vocabulary_list_id_fkey" FOREIGN KEY ("vocabulary_list_id") REFERENCES "vocabulary_lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "vocabulary_list_id" TEXT,
    "story_id" TEXT,
    "title" TEXT,
    "questions" TEXT NOT NULL,
    "total_questions" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quizzes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quizzes_vocabulary_list_id_fkey" FOREIGN KEY ("vocabulary_list_id") REFERENCES "vocabulary_lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quizzes_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "generated_stories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quiz_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_answers" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "time_spent_seconds" INTEGER,
    "completed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "vocabulary_item_id" TEXT NOT NULL,
    "mastery_level" INTEGER NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_practiced" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_progress_vocabulary_item_id_fkey" FOREIGN KEY ("vocabulary_item_id") REFERENCES "vocabulary_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "file_uploads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "processing_status" TEXT NOT NULL DEFAULT 'pending',
    "processing_error" TEXT,
    "vocabulary_list_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" DATETIME,
    CONSTRAINT "file_uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "file_uploads_vocabulary_list_id_fkey" FOREIGN KEY ("vocabulary_list_id") REFERENCES "vocabulary_lists" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "vocabulary_lists_user_id_idx" ON "vocabulary_lists"("user_id");

-- CreateIndex
CREATE INDEX "vocabulary_items_vocabulary_list_id_idx" ON "vocabulary_items"("vocabulary_list_id");

-- CreateIndex
CREATE INDEX "vocabulary_items_simplified_idx" ON "vocabulary_items"("simplified");

-- CreateIndex
CREATE INDEX "vocabulary_items_hsk_level_idx" ON "vocabulary_items"("hsk_level");

-- CreateIndex
CREATE INDEX "vocabulary_items_vocabulary_list_id_hsk_level_idx" ON "vocabulary_items"("vocabulary_list_id", "hsk_level");

-- CreateIndex
CREATE INDEX "generated_stories_user_id_idx" ON "generated_stories"("user_id");

-- CreateIndex
CREATE INDEX "generated_stories_vocabulary_list_id_idx" ON "generated_stories"("vocabulary_list_id");

-- CreateIndex
CREATE INDEX "quizzes_user_id_idx" ON "quizzes"("user_id");

-- CreateIndex
CREATE INDEX "quizzes_vocabulary_list_id_idx" ON "quizzes"("vocabulary_list_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_user_id_idx" ON "quiz_attempts"("user_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_quiz_id_idx" ON "quiz_attempts"("quiz_id");

-- CreateIndex
CREATE INDEX "user_progress_user_id_idx" ON "user_progress"("user_id");

-- CreateIndex
CREATE INDEX "user_progress_mastery_level_idx" ON "user_progress"("mastery_level");

-- CreateIndex
CREATE INDEX "user_progress_user_id_mastery_level_idx" ON "user_progress"("user_id", "mastery_level");

-- CreateIndex
CREATE UNIQUE INDEX "user_progress_user_id_vocabulary_item_id_key" ON "user_progress"("user_id", "vocabulary_item_id");

-- CreateIndex
CREATE INDEX "file_uploads_processing_status_idx" ON "file_uploads"("processing_status");

-- CreateIndex
CREATE INDEX "file_uploads_user_id_created_at_idx" ON "file_uploads"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_session_token_key" ON "user_sessions"("session_token");

-- CreateIndex
CREATE INDEX "user_sessions_session_token_idx" ON "user_sessions"("session_token");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

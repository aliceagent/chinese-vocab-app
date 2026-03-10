# Chinese Vocab App - Product Specification

## Authentication

### Login Requirements (CRITICAL - DO NOT REGRESS)

1. **Accept both email AND username** for login
   - Users can enter their email OR username in the login field
   - Single input field labeled "Email or Username"

2. **Case-insensitive matching**
   - `Jonathan`, `jonathan`, `JONATHAN` all match the same user
   - `User@Example.com`, `user@example.com` all match the same email

3. **Implementation details**
   - Credential field name: `identifier` (not `email`)
   - Query uses Prisma `mode: 'insensitive'` for case-insensitive lookup
   - Searches both `email` and `username` fields with OR condition
   - Input is trimmed and lowercased before comparison

### Registration
- Requires: username, email, password
- Username must be unique (case-insensitive)
- Email must be unique (case-insensitive)
- Password is hashed with bcrypt

### Session Management
- JWT-based sessions via NextAuth
- 24-hour session duration
- Secure cookies in production

---

## Core Features

### Vocabulary Lists
- Upload vocabulary from files (PDF, text)
- Auto-detection of HSK levels
- Frequency scoring for words

### Story Generation
- Generate stories using vocabulary words
- Multiple story types: narrative, dialogue, news, essay
- Difficulty levels: beginner, intermediate, advanced

### Quizzes
- Generate quizzes from vocabulary or stories
- Track quiz attempts and scores
- Progress tracking per vocabulary item

---

## Technical Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: PostgreSQL via Prisma
- **Auth**: NextAuth.js with credentials provider
- **Deployment**: Vercel
- **Storage**: Vercel Blob

---

## Version History

- 2026-03-10: Added explicit auth spec requiring email+username login, case-insensitive

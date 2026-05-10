# High-Level Design (HLD) - WebServices Repository

**Document Version:** 1.0  
**Last Updated:** April 2026  
**Project Type:** Backend API Service  
**Architecture:** NestJS Microservices

---

## 1. Executive Summary

The **WebServices** repository is a comprehensive, scalable backend application built with **NestJS v11.0.1** that serves as a multi-domain content and resource management platform with advanced AI capabilities. The system integrates multiple LLMs (Large Language Models) for intelligent features including RAG (Retrieval Augmented Generation), financial tracking, and content management.

**Primary Purpose:**  
Provide RESTful APIs for:

- User authentication and management
- Content and resource organization
- Learning technology catalogs
- Blog and article management
- AI-powered Q&A with context awareness
- Financial tracking and expense management
- Search and discovery capabilities
- Interview question banking
- Project and learning roadmap management

---

## 2. System Architecture Overview

### 2.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                       │
│            (Web, Mobile, Desktop Clients)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              NestJS REST API Gateway                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Middleware & Interceptors                              │ │
│  │ - CORS Handler                                         │ │
│  │ - Request Logger Middleware                           │ │
│  │ - Global Validation Pipe                              │ │
│  │ - Response Interceptor (Standardization)              │ │
│  └─────────────────────────────────────────────────────────┘ │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│              Feature Modules (17 Modules)                    │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Auth Module  │  │ User Module  │  │ Content Mgmt │        │
│  │              │  │              │  │              │        │
│  │ - Login      │  │ - CRUD Users │  │ - Blog Posts │        │
│  │ - Refresh    │  │ - Profile    │  │ - Topics     │        │
│  │ - Logout     │  │ - Auth Flow  │  │ - Resources  │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ AI Module    │  │ Finance Mod  │  │ Search Mod   │        │
│  │              │  │              │  │              │        │
│  │ - RAG Agent  │  │ - Expenses   │  │ - Index Data │        │
│  │ - LLM Calls  │  │ - Tracking   │  │ - Query      │        │
│  │ - Streaming  │  │ - Analytics  │  │ - Results    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                               │
│  + 11 More Modules (Technologies, Topics, Snippets, etc.)   │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│         Persistence & External Services Layer                │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  MongoDB     │  │  JWT Tokens  │  │  LLM APIs    │        │
│  │  Mongoose    │  │              │  │              │        │
│  │  ODM         │  │  Refresh     │  │ - OpenAI     │        │
│  │              │  │  Management  │  │ - HuggingFace│        │
│  │  Collections:│  │              │  │ - Google     │        │
│  │  - Users     │  │  - Secrets   │  │ - Groq       │        │
│  │  - Content   │  │  - Config    │  │ - Ollama     │        │
│  │  - Blogs     │  │              │  │ - NVIDIA     │        │
│  │  - Resources │  │              │  │              │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐                          │
│  │ Vector DB    │  │  Config      │                          │
│  │              │  │  Service     │                          │
│  │ - Embeddings │  │              │                          │
│  │ - Context    │  │ - Environment│                          │
│  │ - RAG Docs   │  │ - Secrets    │                          │
│  └──────────────┘  └──────────────┘                          │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Component            | Technology                          | Version          |
| -------------------- | ----------------------------------- | ---------------- |
| **Runtime**          | Node.js                             | LTS              |
| **Framework**        | NestJS                              | 11.0.1           |
| **Language**         | TypeScript                          | 5.6+             |
| **Database**         | MongoDB                             | 9.3.1 (Mongoose) |
| **Authentication**   | JWT + Passport                      | Latest           |
| **Validation**       | class-validator                     | 0.14.3           |
| **Password Hash**    | bcrypt                              | 6.0.0            |
| **LLM Integration**  | Multiple (OpenAI, HF, Google, etc.) | Latest           |
| **HTTP Client**      | axios                               | 1.13.4           |
| **Task Scheduling**  | @nestjs/schedule                    | 6.1.0            |
| **State Management** | RxJS                                | 7.8.1            |

---

## 3. Core Modules & Responsibilities

### 3.1 Module Overview Table

| Module             | Purpose                             | Key Entities                      | Status      |
| ------------------ | ----------------------------------- | --------------------------------- | ----------- |
| **Auth**           | User authentication & authorization | JWT tokens, login sessions        | Production  |
| **User**           | User account management             | User profiles, credentials        | Production  |
| **Content**        | Content organization & lifecycle    | Articles, pages, status workflows | Production  |
| **Blog**           | Blog platform management            | Blogs, posts, comments            | Production  |
| **Resources**      | Learning resource management        | Tutorials, guides, references     | Production  |
| **Technologies**   | Tech stack catalog                  | Frameworks, languages, tools      | Production  |
| **Topics**         | Topic organization                  | Topics within technologies        | Production  |
| **AI**             | AI-powered features                 | RAG agents, LLM integration       | Production  |
| **Finance**        | Financial tracking                  | Expenses, transactions            | Production  |
| **Search**         | Content discovery                   | Indexing, querying                | Production  |
| **Interview Bank** | Interview resources                 | Questions, answers, resources     | Production  |
| **Projects**       | Project management                  | Project tracking, documentation   | Development |
| **Roadmap**        | Learning paths                      | Learning roadmaps, progression    | Development |
| **Ideas**          | Idea management                     | Idea capture, organization        | Development |
| **Snippets**       | Code snippets                       | Code storage, tagging             | Development |
| **Bookmarks**      | Content bookmarking                 | Saved references                  | Development |
| **Test**           | Testing module                      | Temporary/test features           | Development |

### 3.2 Detailed Module Architecture

#### Authentication Module

```
AuthModule
├── Controllers
│   └── auth.controller.ts
│       ├── POST /auth/login
│       ├── POST /auth/refresh
│       └── POST /auth/logout
├── Services
│   └── auth.service.ts
│       ├── validateCredentials()
│       ├── generateTokens()
│       └── refreshTokens()
└── Strategies
    └── passport.ts (JWT)
```

#### Content Management Module

```
ContentModule
├── Controllers
│   └── content.controller.ts
├── Services
│   └── content.service.ts
│       ├── createContent()
│       ├── updateContent()
│       ├── publishContent()
│       └── archiveContent()
├── Schemas
│   └── content.schema.ts
│       ├── title
│       ├── body (HTML/Markdown)
│       ├── status (draft|published|archived)
│       ├── technologyId
│       └── topicId
└── DTOs
    └── Validation & transformation
```

#### AI Module (Core Innovation)

```
AIModule
├── Controllers
│   └── ai.controller.ts
│       ├── POST /ai/ask (RAG query)
│       ├── POST /ai/ask/stream (streaming response)
│       ├── POST /ai/add-expense (AI finance)
│       └── GET /ai (list models)
├── Services
│   ├── ai.service.ts
│   │   ├── askQuestion()
│   │   ├── streamResponse()
│   │   └── expenseExtraction()
│   ├── llm.service.ts
│   │   ├── callOpenAI()
│   │   ├── callHuggingFace()
│   │   ├── callGoogle()
│   │   ├── callGroq()
│   │   ├── callOllama()
│   │   └── callNVIDIA()
│   ├── rag.service.ts
│   │   ├── retrieveContext()
│   │   ├── rankDocuments()
│   │   └── generateAnswer()
│   └── vector-db.service.ts
│       ├── storeEmbeddings()
│       ├── queryVector()
│       └── updateIndex()
└── Models
    └── LLM adapters for multiple providers
```

#### Finance Module

```
FinanceModule
├── Controllers
│   └── finance.controller.ts
├── Services
│   ├── finance.service.ts
│   ├── expense.service.ts
│   └── ai-expense.service.ts (RAG integration)
└── Schemas
    └── Expense, Transaction records
```

---

## 4. API Endpoints & Routes

### 4.1 Authentication Endpoints

```
POST   /auth/login                          # User login
POST   /auth/refresh                        # Refresh JWT token
POST   /auth/logout                         # User logout
```

### 4.2 User Management Endpoints

```
POST   /user                                # Create user
GET    /user                                # List all users
GET    /user/:id                            # Get user by ID
PATCH  /user/:id                            # Update user
DELETE /user/:id                            # Delete user
```

### 4.3 Content Management Endpoints

```
POST   /content                             # Create content
GET    /content                             # List content
GET    /content/:id                         # Get content
PATCH  /content/:id                         # Update content
DELETE /content/:id                         # Delete content
POST   /content/:id/publish                 # Publish content
```

### 4.4 Blog Endpoints

```
POST   /blogs                               # Create blog
GET    /blogs                               # List blogs
GET    /blogs/:id                           # Get blog details
POST   /blogs/:id/posts                     # Add post to blog
GET    /blogs/:id/posts                     # List blog posts
GET    /blogs/:blogId/posts/:postId         # Get post
PATCH  /blogs/:blogId/posts/:postId         # Update post
DELETE /blogs/:blogId/posts/:postId         # Delete post
```

### 4.5 AI Module Endpoints

```
POST   /ai/ask                              # Ask question with RAG
POST   /ai/ask/stream                       # Stream AI response
POST   /ai/add-expense                      # Add expense with AI
GET    /ai                                  # List available models
```

### 4.6 Resource Endpoints

```
POST   /resources                           # Create resource
GET    /resources                           # List resources
GET    /resources/:id                       # Get resource
PATCH  /resources/:id                       # Update resource
DELETE /resources/:id                       # Delete resource
```

### 4.7 Other Key Endpoints

```
# Technologies
GET    /technologies                        # List tech stack
GET    /technologies/:id/topics             # Get topics for tech

# Topics
GET    /topics/:id/content                  # Get content for topic

# Search
POST   /search                              # Search content

# Finance
POST   /finance/expenses                    # Create expense
GET    /finance/expenses                    # List expenses
GET    /finance/stats                       # Get finance stats

# Interview Bank
GET    /interview-bank/questions            # List questions
GET    /interview-bank/questions/:id        # Get question details

# Snippets
POST   /snippets                            # Create snippet
GET    /snippets                            # List snippets
```

---

## 5. Data Models & Database Schema

### 5.1 Core Models

#### User Schema

```typescript
{
  _id: ObjectId,
  email: string (unique),
  password: string (bcrypt hashed),
  firstName: string,
  lastName: string,
  avatar?: string,
  createdAt: Date,
  updatedAt: Date,
  isActive: boolean
}
```

#### Content Schema

```typescript
{
  _id: ObjectId,
  title: string,
  body: string (HTML/Markdown),
  status: 'draft' | 'published' | 'archived',
  technologyId: ObjectId,
  topicId: ObjectId,
  authorId: ObjectId,
  viewCount: number,
  readingTime: number,
  tags: string[],
  createdAt: Date,
  updatedAt: Date
}
```

#### Blog Schema

```typescript
{
  _id: ObjectId,
  title: string,
  slug: string (unique),
  description: string,
  status: 'draft' | 'published' | 'archived',
  isFeatured: boolean,
  isPinned: boolean,
  authorId: ObjectId,
  authorName: string,
  authorAvatarUrl: string,
  viewCount: number,
  createdAt: Date,
  updatedAt: Date
}
```

#### BlogPost Schema

```typescript
{
  _id: ObjectId,
  blogId: ObjectId,
  title: string,
  content: string,
  status: 'draft' | 'review' | 'published',
  authorId: ObjectId,
  readingTime: number,
  viewCount: number,
  createdAt: Date,
  updatedAt: Date
}
```

#### Technology Schema

```typescript
{
  _id: ObjectId,
  name: string,
  icon: string,
  description: string,
  order: number,
  isActive: boolean
}
```

#### Topic Schema

```typescript
{
  _id: ObjectId,
  name: string,
  description: string,
  technologyId: ObjectId,
  order: number,
  resources: ObjectId[]
}
```

#### Finance Schema

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  amount: number,
  category: string,
  description: string,
  date: Date,
  tags: string[],
  createdAt: Date
}
```

---

## 6. Authentication & Security

### 6.1 Authentication Flow

```
1. User Login Request
   └─ POST /auth/login with email & password
      └─ Validate credentials against hashed password (bcrypt)
         └─ Generate JWT Token (10-minute expiration)
            └─ Generate Refresh Token (long-lived)
               └─ Return tokens to client

2. Subsequent Requests
   └─ Include JWT in Authorization header (Bearer token)
      └─ JWT Strategy validates token at gateway
         └─ Request proceeds if valid
            └─ Refresh if near expiration using Refresh Token

3. Token Refresh
   └─ POST /auth/refresh with refresh token
      └─ Validate refresh token
         └─ Generate new JWT
            └─ Return new token to client
```

### 6.2 Security Measures

- **Password Security**: Bcrypt hashing with salt rounds
- **JWT Tokens**: 10-minute expiration for access tokens
- **CORS**: Enabled for cross-origin requests
- **Input Validation**: Global ValidationPipe (class-validator)
- **Error Handling**: Standardized error responses

---

## 7. External Integrations

### 7.1 LLM Provider Integrations

The AI module supports multiple LLM providers through abstract interfaces:

| Provider         | Library                | Use Case             | Status |
| ---------------- | ---------------------- | -------------------- | ------ |
| **OpenAI**       | openai@^6.18.0         | GPT models, primary  | Active |
| **HuggingFace**  | @huggingface/inference | Open-source models   | Active |
| **Google GenAI** | @google/genai          | Google's models      | Active |
| **Groq**         | groq-sdk               | High-speed inference | Active |
| **Ollama**       | ollama                 | Local models         | Active |
| **NVIDIA**       | NVIDIA API             | Cloud inference      | Active |

### 7.2 Firebase Integration

- **Authentication**: Firebase Auth (optional)
- **Database**: Firestore support ready
- **Realtime Database**: Firebase Realtime DB ready

### 7.3 Vector Database

- **Purpose**: Store embeddings for RAG
- **Functions**:
  - Store document embeddings
  - Semantic similarity search
  - Context retrieval for AI responses

---

## 8. Application Flow & Request Processing

### 8.1 Typical Request Lifecycle

```
1. Incoming HTTP Request
   ▼
2. CORS Handler (validate origin)
   ▼
3. Logger Middleware (log request details)
   ▼
4. Route Matching (select controller method)
   ▼
5. JWT Validation (if protected route)
   ▼
6. Global Validation Pipe (validate DTO & transform)
   ▼
7. Controller Handler Execution
   ▼
8. Service Layer (business logic)
   ▼
9. Database Query (if needed) via Mongoose
   ▼
10. Response Interceptor (standardize response)
    ▼
11. HTTP Response to Client
```

### 8.2 RAG Query Flow

```
User Query
  ▼
AI Controller /ask endpoint
  ▼
AI Service receives query
  ▼
Vector DB Service retrieves relevant documents
  ▼
RAG Service ranks & prepares context
  ▼
LLM Service calls selected provider
  ▼
LLM generates answer with context
  ▼
Response formatted & returned to client
```

---

## 9. Configuration & Environment

### 9.1 Environment Variables

```env
# Server
NODE_ENV=production|development
PORT=3000

# Database
MONGODB_URI=mongodb://...

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=600

# LLM Providers
OPENAI_API_KEY=...
HUGGINGFACE_API_KEY=...
GOOGLE_API_KEY=...
GROQ_API_KEY=...

# Features
ENABLE_RAG=true
ENABLE_STREAMING=true
```

### 9.2 Configuration Files

| File                  | Purpose                           |
| --------------------- | --------------------------------- |
| `nest-cli.json`       | NestJS CLI settings               |
| `tsconfig.json`       | TypeScript configuration (ES2023) |
| `tsconfig.build.json` | Build-specific TypeScript config  |

---

## 10. Deployment Architecture

### 10.1 Build & Runtime

```
Source Code (TypeScript)
  ▼
npm run build
  ▼
TypeScript Compiler
  ▼
dist/ (JavaScript output)
  ▼
npm run start:prod
  ▼
Node.js Process
  ▼
Port 3000 (default)
```

### 10.2 Deployment Considerations

- **Containerization**: Ready for Docker deployment
- **Horizontal Scaling**: Stateless design allows multiple instances
- **Database**: External MongoDB connection string
- **Load Balancing**: Can run behind load balancer
- **Health Checks**: `/health` endpoint for monitoring

---

## 11. Development Commands

```bash
# Installation
npm install

# Development
npm run start:dev          # Run with hot reload
npm run start:debug        # Run with debugger attached

# Production
npm run build              # Compile TypeScript
npm run start              # Run compiled application
npm run start:prod         # Alternative production run

# Testing
npm test                   # Run unit tests
npm run test:watch        # Watch mode for tests
npm run test:cov          # Code coverage report
npm run test:e2e          # End-to-end tests

# Code Quality
npm run lint              # ESLint check & fix
npm run format            # Prettier formatting
```

---

## 12. API Documentation

- This service does not include a built-in API documentation UI.
- Request contracts are defined directly in controllers, DTO validation rules, and the Postman collection.

---

## 13. Monitoring & Logging

### 13.1 Request Logging

- Logger Middleware logs all incoming HTTP requests
- Captures: method, URL, query params, headers, body
- Useful for debugging and monitoring

### 13.2 Health Monitoring

- `GET /health` endpoint for application status
- Can be used for load balancer health checks
- Useful for containerized deployments

---

## 14. Key Design Patterns

### 14.1 Patterns Used

1. **Modular Architecture**: Feature-based module organization
2. **Service Layer Pattern**: Business logic separation
3. **Factory Pattern**: Controller creation
4. **Dependency Injection**: NestJS IoC container
5. **Repository Pattern**: Data access abstraction
6. **Middleware Pattern**: Request processing pipeline
7. **Interceptor Pattern**: Request/response interception
8. **Guard Pattern**: Authorization/authentication
9. **Pipe Pattern**: Data transformation & validation
10. **Adapter Pattern**: Multiple LLM provider support

---

## 15. Data Flow Architecture

### 15.1 Content Creation Flow

```
Frontend Client
  │
  └─► POST /content
       │
       └─► ContentController
            │
            └─► ContentService.createContent()
                 │
                 └─► ContentSchema.create()
                      │
                      └─► MongoDB Collection
                           │
                           └─► Response Interceptor
                                │
                                └─► JSON Response to Client
```

### 15.2 AI-Enhanced Flow

```
Frontend Client (Query)
  │
  └─► POST /ai/ask
       │
       └─► AIController
            │
            └─► AIService.askQuestion()
                 │
                 ├─► Vector DB Search (context retrieval)
                 │
                 ├─► RAG Service (context ranking)
                 │
                 └─► LLM Service
                      │
                      ├─► Provider Selection (OpenAI, HF, etc.)
                      │
                      └─► API Call to LLM
                           │
                           └─► Stream/Buffer Response
                                │
                                └─► JSON Response to Client
```

---

## 16. Future Enhancements

- [ ] Real-time updates via WebSockets
- [ ] GraphQL API layer
- [ ] Advanced caching strategies (Redis)
- [ ] Message queue integration (Bull, RabbitMQ)
- [ ] Microservices architecture split
- [ ] Advanced analytics & metrics
- [ ] Multi-tenant support
- [ ] API rate limiting & throttling
- [ ] Advanced permission system (RBAC)
- [ ] Webhook support for integrations

---

## 17. Conclusion

The WebServices repository provides a robust, enterprise-grade backend platform for content management with cutting-edge AI capabilities. The modular architecture ensures maintainability and scalability, while the multi-LLM support provides flexibility in AI implementation. The system is production-ready for deployment with proper consideration for containerization, database configuration, and environment-specific settings.

---

**Document prepared for: Architecture Review & Deployment Planning**  
**Stakeholders: Development Team, DevOps, Product Management**

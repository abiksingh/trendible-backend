# Trendible Backend

A modern Express.js backend application built with TypeScript and Prisma ORM following 2025 best practices.

## 🚀 Features

- **Express.js 5.x** - Fast, unopinionated web framework
- **TypeScript** - Type-safe JavaScript
- **Prisma ORM** - Modern database toolkit
- **PostgreSQL** - Robust relational database
- **RESTful API** - Clean API architecture
- **Environment Configuration** - Secure config management

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL database (or use Prisma Postgres)

## 🛠 Installation

1. **Clone and navigate to the project:**
   ```bash
   cd trendible-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   - The `.env` file is already configured with Prisma Postgres connection
   - For custom database, update `DATABASE_URL` in `.env`

4. **Database Setup:**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Create and apply migration
   npm run db:migrate
   
   # Alternative: Push schema changes directly
   npm run db:push
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   ```

## 📝 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio (database GUI)

## 🏗 Project Structure

```
src/
├── controllers/     # Request handlers
├── routes/          # API route definitions
├── services/        # Business logic
├── utils/           # Utility functions
└── server.ts        # Application entry point

prisma/
└── schema.prisma    # Database schema
```

## 🔌 API Endpoints

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## 📊 Example API Usage

**Create a user:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "name": "John Doe"}'
```

**Get all users:**
```bash
curl http://localhost:3000/api/users
```

## 🌐 Environment Variables

```env
DATABASE_URL="your-database-connection-string"
PORT=3000
NODE_ENV=development
```

## 🗄️ Database Schema

The project includes a basic `User` model:

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 📈 Next Steps

- Add authentication middleware
- Implement input validation
- Add comprehensive error handling
- Create automated tests
- Set up CI/CD pipeline
- Add API documentation (Swagger/OpenAPI)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

ISC License
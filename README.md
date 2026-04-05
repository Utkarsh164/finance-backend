# Finance Data Processing & Access Control Backend

A role-based backend system for managing financial transactions and generating dashboard insights.

This project demonstrates backend architecture, API design, access control, and data processing using a clean and structured approach. It is designed so that anyone with no prior context can quickly understand how the system works and how to interact with the APIs.

---

## Tech Stack

* **Node.js**
* **Express.js**
* **PostgreSQL**
* **Prisma ORM**
* **JWT Authentication**
* **Cookie-based session handling**
* **bcrypt (password hashing)**

---

## Features

### 1. User & Role Management

* Register and login users
* Role-based access control:

  * **ADMIN**
  * **ANALYST**
  * **VIEWER**
* User status management:

  * ACTIVE
  * INACTIVE
* Admin capabilities:

  * View all users
  * Update user role and status

---

### 2. Financial Transactions

* Create, read, update, delete transactions
* Each transaction includes:

  * amount
  * type (INCOME / EXPENSE)
  * category
  * notes
  * transactionDate
* Supports:

  * Filtering (type, category, date range)
  * Pagination
  * Sorting

---

### 3. Dashboard Summary APIs

Provides aggregated financial insights:

* Total Income
* Total Expenses
* Net Balance
* Category-wise breakdown
* Monthly trends (last 12 months)
* Recent transactions

---

### 4. Access Control

| Role    | Permissions                                       |
| ------- | ------------------------------------------------- |
| VIEWER  | Read-only access                                  |
| ANALYST | Create & update own transactions + view dashboard |
| ADMIN   | Full access (users + all transactions)            |

---

## Authentication

* JWT token is generated on login
* Stored in **HTTP-only cookies**
* Required for all protected routes

### Middleware Used:

* `authenticate` → verifies user
* `requireAdmin` → restricts to admin only
* `requireAnalystOrAbove` → allows analyst & admin

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/Utkarsh164/finance-backend.git
cd project
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env` file

```env
PORT=3000
JWT_SECRET=your_secret_key
DATABASE_URL=your_database_url
DIRECT_URL=your_direct_db_url
```

### 4. Run Prisma

```bash
npx prisma generate
npx prisma migrate dev
```

### 5. Start the server

```bash
npm run dev
```

Server will run on:

```
http://localhost:3000
```

---

## API Documentation

### Base URL

```
http://localhost:3000
```

---

## User APIs

### Register User

**POST** `/users/register`

Request:

```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "123456"
}
```

---

### Login User

**POST** `/users/login`

Request:

```json
{
  "email": "john@example.com",
  "password": "123456"
}
```

Response:

* Sets cookie: `token`

---

### Logout User

**GET** `/users/logout`

---

### Get All Users (Admin Only)

**GET** `/users/all?page=1&limit=10&role=ADMIN`

---

### Update User (Admin Only)

**PUT** `/users/update/:id`

Request:

```json
{
  "role": "ANALYST",
  "status": "ACTIVE"
}
```

---

## Transaction APIs

### Create Transaction

**POST** `/transactions`

Request:

```json
{
  "amount": 500,
  "type": "INCOME",
  "category": "Salary",
  "notes": "Monthly salary"
}
```

---

### Get All Transactions

**GET** `/transactions?type=INCOME&category=food&page=1&limit=10`

---

### Get Transaction by ID

**GET** `/transactions/:id`

---

### Update Transaction

**PUT** `/transactions/:id`

Request:

```json
{
  "amount": 600,
  "category": "Updated category"
}
```

---

### Delete Transaction

**DELETE** `/transactions/:id`

---

## Dashboard API

### Get Dashboard Summary

**GET** `/transactions/dashboard`

Response:

```json
{
  "success": true,
  "message": "Dashboard summary fetched successfully.",
  "data": {
    "summary": {
      "totalIncome": 10000,
      "totalExpenses": 4000,
      "netBalance": 6000,
      "totalTransactions": 10
    },
    "categoryBreakdown": [],
    "monthlyTrends": [],
    "recentTransactions": []
  }
}
```

---

## Important Notes

* First registered user is automatically assigned **ADMIN**
* JWT is stored in **HTTP-only cookies**
* Analysts can only modify their own transactions
* Admin can access and manage everything
* Input validation is applied across all APIs

---

## Assumptions

* Authentication is cookie-based
* No frontend included (backend-only project)
* Transaction date defaults to current timestamp
* Soft delete is not implemented

---

## Design Decisions

* Prisma used for clean and scalable database interaction
* Role-based middleware ensures clear access control
* Aggregations handled efficiently at database level
* Pagination implemented for scalability

---

## Future Improvements

* Refresh token system
* Soft delete support
* Unit & integration testing
* Swagger/OpenAPI documentation
* Rate limiting

---


Important:

* Login first to receive cookie
* Enable cookies in your API client

---

## Conclusion

This project demonstrates a clean and maintainable backend system with proper role-based access control, structured APIs, and financial data processing suitable for a dashboard application.

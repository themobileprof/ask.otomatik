# Admin API Documentation

## Authentication & Authorization
- All admin endpoints require the user to be authenticated and have `role: 'admin'`.
- The backend expects a JWT in the `Authorization` header as `Bearer <token>`.
- The JWT includes the user's role, which the frontend can use to show/hide admin features.

---

## GET /api/admin/users
List all users.

### Response
- **Success (200):**
  ```json
  [
    { "id": 1, "email": "admin@example.com", "name": "Admin", "role": "admin", ... },
    { "id": 2, "email": "user@example.com", "name": "User", "role": "user", ... }
  ]
  ```

---

## PATCH /api/admin/users/:id/role
Change a user's role (e.g., promote to admin).

### Request
- **Body:**
  ```json
  { "role": "admin" }
  ```

### Response
- **Success (200):**
  ```json
  { "message": "User role updated", "id": 2, "role": "admin" }
  ```

---

## GET /api/admin/settings
Get current workdays, work hours, and buffer between sessions.

### Response
- **Success (200):**
  ```json
  { "workDays": [1,2,3,4,5], "workStart": 9, "workEnd": 17, "bufferMinutes": 60 }
  ```

---

## PATCH /api/admin/settings
Update workdays, work hours, and buffer between sessions.

### Request
- **Body:**
  ```json
  {
    "workDays": [1,2,3,4,5],
    "workStart": 9,
    "workEnd": 17,
    "bufferMinutes": 60
  }
  ```

### Response
- **Success (200):**
  ```json
  { "message": "Settings updated", "id": 1 }
  ```

---

## GET /api/admin/stats
Get booking and user statistics for the admin dashboard.

### Response
- **Success (200):**
  ```json
  {
    "totalBookings": 150,
    "totalPaidBookings": 120,
    "totalFreeBookings": 30,
    "totalRevenue": 18000,
    "totalUsers": 145,
    "bookingsByType": [
      { "type": "free", "count": 30 },
      { "type": "paid", "count": 120 }
    ],
    "recentBookings": [
      {
        "id": 1,
        "date": "2025-06-13",
        "time": "10:00 AM",
        "type": "paid",
        "cost": "$150",
        "email": "user@example.com",
        "createdAt": "2025-06-03T12:00:00Z",
        "userName": "John Doe",
        "userPicture": "https://..."
      }
      // ... up to 5 recent bookings
    ],
    "upcomingBookings": [
      {
        "id": 2,
        "date": "2025-06-14",
        "time": "2:00 PM",
        "type": "free",
        "email": "user2@example.com",
        "createdAt": "2025-06-03T13:00:00Z",
        "userName": "Jane Smith",
        "userPicture": "https://..."
      }
      // ... up to 5 upcoming bookings
    ]
  }
  ```

- **Error (401):**
  ```json
  { "error": "Missing or invalid Authorization header" }
  ```
- **Error (403):**
  ```json
  { "error": "Admin access required" }
  ```

The stats endpoint provides:
- Total number of bookings
- Number of paid and free bookings
- Total revenue from paid bookings
- Total number of users
- Distribution of bookings by type
- 5 most recent bookings with user details
- 5 upcoming bookings with user details

---

## Notes
- All admin endpoints require admin privileges.
- Extend with more endpoints as needed for bookings, payments, etc.

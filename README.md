# University Admission Management System

A full-stack web application for managing the university admission process. The system provides separate interfaces for students, faculty, and administrators to handle registration, applications, courses, documents, and admission-related activities.

## Features

* Student registration and login
* Password validation and password visibility toggle
* JWT-based authentication
* Student dashboard
* Online admission application management
* Course information and course selection
* Document upload and verification
* Application status tracking
* Admin dashboard and management functions
* Faculty dashboard and student-related functions
* MongoDB database integration
* Automatic database seeding
* JSON data synchronization
* Scheduled data synchronization using cron
* File upload support
* User-friendly web interface

## Technologies Used

### Frontend

* HTML5
* CSS3
* JavaScript

### Backend

* Node.js
* Express.js
* REST APIs
* JWT Authentication
* bcryptjs
* Multer

### Database

* MongoDB
* Mongoose

### Other Tools

* Git & GitHub
* dotenv
* node-cron
* express-validator
* CORS

## Project Modules

### 1. Student Module

Students can:

* Create an account
* Log in securely
* Complete and manage admission details
* Apply for courses
* Upload required documents
* Track application information and status

### 2. Faculty Module

Faculty functionality is provided through dedicated backend routes for managing student-related academic and admission information.

### 3. Admin Module

Administrators can access management functions for:

* Students
* Applications
* Courses
* Documents
* Faculty-related information
* Admission records and system activities

### 4. Authentication Module

The application includes:

* Student registration
* Login authentication
* Password hashing
* JWT token generation
* Protected backend routes
* Input validation

### 5. Document Module

The system supports document uploads and document-related processing through the backend document APIs.

### 6. Application Module

The application module handles admission application creation, retrieval, updates, and status-related operations.

## Project Structure

```text
University-Admission-Management-System/
│
├── backend/
│   ├── middleware/
│   │   └── auth.js
│   │
│   ├── models/
│   │   ├── ActivityLog.js
│   │   ├── Application.js
│   │   ├── Course.js
│   │   ├── Document.js
│   │   └── User.js
│   │
│   ├── routes/
│   │   ├── admin.js
│   │   ├── applications.js
│   │   ├── auth.js
│   │   ├── courses.js
│   │   ├── documents.js
│   │   ├── faculty.js
│   │   └── students.js
│   │
│   ├── server.js
│   ├── seed.js
│   └── package.json
│
├── admin-login.html
├── admin.html
├── dashboard.html
├── index.html
├── login.html
├── app.js
├── helpers.js
├── style.css
└── start.sh
```

## How to Run

### Prerequisites

Make sure the following are installed:

* Node.js
* npm
* MongoDB

### Step 1: Clone the Repository

```bash
git clone https://github.com/Hasini08779/University-Admission-Management-System.git
cd University-Admission-Management-System
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 3: Configure MongoDB

The application uses this default local MongoDB database:

```text
mongodb://localhost:27017/university-admission
```

You can also provide your own MongoDB connection string using the `MONGODB_URI` environment variable.

### Step 4: Start the Application

From the `backend` directory:

```bash
npm start
```

The server runs on:

```text
http://localhost:5001
```

Open the student interface:

```text
http://localhost:5001/index.html
```

Admin login:

```text
http://localhost:5001/admin-login.html
```

The backend serves the frontend files, so a separate frontend server is not required.

## Database and Data Synchronization

When the backend connects successfully to MongoDB, the system initializes seed data and performs JSON synchronization.

The project also includes:

* Scheduled synchronization using `node-cron`
* Database change-stream based synchronization when supported by the MongoDB deployment
* Utility scripts for database and JSON data management

## API Routes

The backend provides REST API groups for:

| Module         | Base Route          |
| -------------- | ------------------- |
| Authentication | `/api/auth`         |
| Students       | `/api/students`     |
| Courses        | `/api/courses`      |
| Documents      | `/api/documents`    |
| Applications   | `/api/applications` |
| Admin          | `/api/admin`        |
| Faculty        | `/api/faculty`      |

## Screenshots

Screenshots of the main application pages can be added here.

Suggested screenshots:

* Home Page
* Student Login
* Student Registration
* Student Dashboard
* Admission Application Form
* Document Upload
* Application Status
* Admin Login
* Admin Dashboard
* Faculty Dashboard

## Future Enhancements

* Online payment gateway integration
* Email and SMS notifications
* Advanced admission analytics
* Role-based access control improvements
* Cloud deployment
* Improved password recovery with a real OTP service
* Automated email notifications for application status changes
* Enhanced mobile responsiveness

## Security

The project uses:

* Password hashing with bcryptjs
* JWT-based authentication
* Protected backend routes
* Request validation
* Environment variables for configuration

Sensitive configuration files and generated data should not be committed to the repository.

## Author

**Hasini Darsi**

GitHub: [Hasini08779](https://github.com/Hasini08779)

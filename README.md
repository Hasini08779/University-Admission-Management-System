# University Admission Management System

A full-stack web application developed to simplify and manage the university admission process. The system provides separate modules for **Students** and **Admins** to manage applications, documents, student information, and admission-related activities.

## Features

### Student Module

* Student registration and login
* Student profile management
* Online admission application
* Submit required documents
* View application details
* Track application status
* View admission-related information
* Receive notifications and updates

### Admin Module

* Admin login
* View and manage student applications
* Manage student records
* Verify submitted documents
* Manage admission information
* Monitor application status
* View application statistics and details

## Technologies Used

### Frontend

* HTML5
* CSS3
* JavaScript

### Backend

* Node.js
* Express.js

### Database

* MongoDB
* Mongoose

### Other Technologies

* JWT Authentication
* Multer for file uploads
* Express Validator
* bcryptjs for password hashing
* CORS
* dotenv
* Node Cron

## Project Modules

The system consists of two main modules:

### 1. Student Module

The Student Module allows students to register, log in, submit admission applications, upload required documents, and track their application status.

### 2. Admin Module

The Admin Module allows administrators to manage student applications, verify documents, manage student records, and monitor the admission process.

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
│   │   └── students.js
│   │
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── HTML files
│   ├── CSS files
│   └── JavaScript files
│
└── README.md
```

## Installation and Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/Hasini08779/University-Admission-Management-System.git
```

### Step 2: Open the Project

```bash
cd University-Admission-Management-System
```

### Step 3: Go to the Backend Folder

```bash
cd backend
```

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Start the Server

```bash
npm start
```

The application runs on:

```text
http://localhost:5001
```

## Database

This project uses **MongoDB** as the database.

The default local MongoDB connection is:

```text
mongodb://localhost:27017/university-admission
```

The application uses Mongoose to connect the Node.js backend with MongoDB.

## API Routes

| Module         | Route               | Purpose                          |
| -------------- | ------------------- | -------------------------------- |
| Authentication | `/api/auth`         | Registration and login           |
| Students       | `/api/students`     | Student-related operations       |
| Applications   | `/api/applications` | Admission application management |
| Documents      | `/api/documents`    | Document upload and verification |
| Courses        | `/api/courses`      | Course-related operations        |
| Admin          | `/api/admin`        | Admin-related operations         |

## Authentication and Security

The application includes authentication and security features such as:

* JWT-based authentication
* Password hashing using bcryptjs
* Protected API routes
* Input validation using Express Validator
* Environment variables using dotenv
* CORS configuration

## Application Workflow

```text
Student Registration
        ↓
Student Login
        ↓
Fill Admission Application
        ↓
Upload Required Documents
        ↓
Application Submitted
        ↓
Admin Reviews Application
        ↓
Admin Verifies Documents
        ↓
Application Status Updated
        ↓
Student Tracks Status
```

## Screenshots

Screenshots of the Student and Admin modules can be added here to demonstrate the application's user interface.

## Future Enhancements

* Online fee payment integration
* Email and SMS notifications
* Advanced admin analytics
* Improved document management
* Application search and filtering
* Deployment using cloud services

## Conclusion

The **University Admission Management System** provides a digital platform for managing the university admission process. It reduces manual work by allowing students to submit applications and documents online while providing administrators with tools to manage and monitor the admission process efficiently.




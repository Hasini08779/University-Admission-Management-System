const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');
require('dotenv').config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/university-admission');

    // Check if data already exists to avoid re-seeding
    const existingCourses = await Course.countDocuments();
    if (existingCourses > 0) {
      console.log('Data already seeded, skipping...');
      return;
    }

    // Fallback admins to seed
    const fallbackAdmins = [
      { email: 'admin@university.edu', password: 'admin123', name: 'System Administrator', role: 'admin' },
      { email: 'faculty@university.edu', password: 'faculty123', name: 'Faculty Member', role: 'faculty' },
      { email: 'admin@gmail.com', password: 'admin123', name: 'Admin', role: 'admin' },
      { email: 'hod@gmail.com', password: 'admin123', name: 'HOD', role: 'admin' },
      { email: 'principal@gmail.com', password: 'admin123', name: 'Principal', role: 'admin' },
      { email: 'staff1@gmail.com', password: 'admin123', name: 'Staff', role: 'admin' },
      { email: 'staff2@gmail.com', password: 'admin123', name: 'Staff', role: 'admin' },
      { email: 'coordinator@gmail.com', password: 'admin123', name: 'Coordinator', role: 'admin' }
    ];

    // Create fallback users if they don't exist
    for (const userData of fallbackAdmins) {
      const userExists = await User.findOne({ email: userData.email });
      if (!userExists) {
        const user = new User(userData);
        await user.save();
        console.log(`${userData.role} user ${userData.email} created`);
      }
    }

    // Create courses
    const courses = [
      { name: "AI & Machine Learning", description: "Learn AI/ML algorithms and deep learning concepts.", icon: "🤖", category: "Engineering" },
      { name: "Cyber Security", description: "Protect networks and data from threats.", icon: "🔐", category: "Engineering" },
      { name: "Electronics & Communication (ECE)", description: "Signals, circuits, and communication systems.", icon: "⚡", category: "Engineering" },
      { name: "Information Technology (IT)", description: "Software, networks, and IT systems.", icon: "💻", category: "Engineering" },
      { name: "Computer Science (CSE)", description: "Programming, algorithms, and systems design.", icon: "🖥️", category: "Engineering" },
      { name: "Data Science", description: "Analyze and interpret big data.", icon: "📊", category: "Engineering" },
      { name: "Blockchain Technology", description: "Learn decentralized and secure systems.", icon: "⛓️", category: "Engineering" },
      { name: "Electronics", description: "Electronics systems and embedded design.", icon: "🔌", category: "Engineering" },
      { name: "Electrical", description: "Power systems, circuits, and electronics.", icon: "⚡", category: "Engineering" },
      { name: "Mechanical", description: "Machines, thermodynamics, and robotics.", icon: "⚙️", category: "Engineering" },
      { name: "Civil", description: "Construction, structures, and infrastructure design.", icon: "🏗️", category: "Engineering" },
      { name: "Chemical", description: "Industrial chemistry and process engineering.", icon: "🧪", category: "Engineering" },
      { name: "Aerospace", description: "Aerodynamics and spacecraft design.", icon: "✈️", category: "Engineering" },
      { name: "Biomedical", description: "Medical devices and bioengineering.", icon: "🧬", category: "Engineering" },
      { name: "Biotechnology", description: "Genetics, microbiology, and biotech applications.", icon: "🧬", category: "Engineering" },
      { name: "Agricultural", description: "Crop science, farming techniques, and agri-tech.", icon: "🌾", category: "Engineering" },
      { name: "MBA", description: "Management, finance, marketing, and leadership skills.", icon: "📈", category: "Management" },
      { name: "BBA", description: "Business administration, management, and entrepreneurship.", icon: "📊", category: "Management" },
      { name: "MCA", description: "Master of Computer Applications and software development.", icon: "🖥️", category: "Management" },
      { name: "Economics", description: "Micro & macroeconomics, finance, and economic theory.", icon: "💰", category: "Management" },
      { name: "Finance", description: "Corporate finance, investment, and banking fundamentals.", icon: "💵", category: "Management" },
      { name: "Marketing", description: "Advertising, branding, and digital marketing strategies.", icon: "📣", category: "Management" },
      { name: "HR", description: "Human resource management and organizational behavior.", icon: "👥", category: "Management" },
      { name: "Psychology", description: "Study of human behavior and mind.", icon: "🧠", category: "Arts" },
      { name: "Sociology", description: "Study of society and social behavior.", icon: "🌍", category: "Arts" },
      { name: "English", description: "Study of language and literature.", icon: "✍️", category: "Arts" },
      { name: "History", description: "World history, civilizations, and research.", icon: "📜", category: "Arts" },
      { name: "Philosophy", description: "Logic, ethics, and metaphysics.", icon: "🧠", category: "Arts" },
      { name: "Journalism", description: "Media, reporting, and news communication.", icon: "📰", category: "Arts" },
      { name: "Design", description: "Graphic, product, and UX/UI design.", icon: "🎨", category: "Arts" },
      { name: "Environmental", description: "Environmental science, sustainability, and policy.", icon: "🌱", category: "Arts" }
    ];

    for (const courseData of courses) {
      const existingCourse = await Course.findOne({ name: courseData.name });
      if (existingCourse) {
        // Update existing course
        existingCourse.description = courseData.description;
        existingCourse.icon = courseData.icon;
        existingCourse.category = courseData.category;
        await existingCourse.save();
        console.log(`Course updated: ${existingCourse.name}`);
      } else {
        const course = new Course(courseData);
        await course.save();
        console.log(`Course created: ${course.name}`);
      }
    }

    console.log('Seeding completed');
  } catch (error) {
    console.error('Seeding error:', error);
    throw error; // Throw instead of exit for server use
  }
};

module.exports = seedData;
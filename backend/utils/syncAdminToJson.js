const fs = require('fs');
const path = require('path');
const User = require('../models/User');

const syncAdminToJson = async () => {
  try {
    // Query all admins from MongoDB
    const admins = await User.find({ role: 'admin' })
      .select('-password')
      .lean();

    // Format date helper
    const formatDate = (date) => {
      const d = new Date(date);
      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${hh}:${min}:${ss} ${dd}:${mm}:${yy}`;
    };

    // Format admin data
    const formattedAdmins = admins.map((admin) => {
      return {
        _id: admin._id.toString(),
        email: admin.email,
        name: admin.name,
        phone: admin.phone || '',
        role: admin.role,
        lastLogin: admin.lastLogin ? formatDate(admin.lastLogin) : null,
        createdAt: formatDate(admin.createdAt)
      };
    });

    // Sort by createdAt in ascending order (oldest first, newest last)
    const parseFormattedDate = (formattedDate) => {
      if (!formattedDate) return new Date(0);
      const [time, date] = formattedDate.split(' ');
      const [dd, mm, yy] = date.split(':');
      return new Date(`20${yy}-${mm}-${dd}T${time}`);
    };

    formattedAdmins.sort((a, b) => {
      const dateA = parseFormattedDate(a.createdAt);
      const dateB = parseFormattedDate(b.createdAt);
      return dateA - dateB;
    });

    // Write to admin.json
    const filePath = path.join(__dirname, '..', '..', 'admin.json');
    fs.writeFileSync(filePath, JSON.stringify(formattedAdmins, null, 2));

    console.log(`✅ Synced to admin.json (${formattedAdmins.length} admins)`);
  } catch (error) {
    console.error('Error syncing admin data to JSON:', error);
  }
};

module.exports = syncAdminToJson;

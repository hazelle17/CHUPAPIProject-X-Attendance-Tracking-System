const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const config = require('../config/config');

async function fixAdminAccounts() {
  try {
    await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB\n');

    // Find all admin accounts
    console.log('Before fixes:');
    console.log('---------------------');
    const admins = await Admin.find({});
    admins.forEach(admin => {
      console.log(`ID: ${admin._id}`);
      console.log(`Username: ${admin.username}`);
      console.log(`Name: ${admin.name}`);
      console.log(`Role: ${admin.role}`);
      console.log(`Password: ${admin.password}`);
      console.log('---------------------');
    });

    // Fix the first admin account
    const firstAdmin = await Admin.findOne({ name: 'admin' });
    if (firstAdmin) {
      firstAdmin.username = 'admin@gmail.com';
      firstAdmin.password = 'admin123';
      firstAdmin.role = firstAdmin.role || 'Admin';
      await firstAdmin.save();
      console.log('\nFixed first admin account:');
      console.log('Username set to: admin@gmail.com');
      console.log('Password set to: admin123');
    }

    // Fix the second admin account
    const secondAdmin = await Admin.findOne({ name: 'Admin User' });
    if (secondAdmin) {
      secondAdmin.password = 'admin123';
      secondAdmin.role = secondAdmin.role || 'Admin';
      await secondAdmin.save();
      console.log('\nFixed second admin account:');
      console.log('Password set to: admin123');
    }

    // Show final state
    console.log('\nAfter fixes:');
    console.log('---------------------');
    const updatedAdmins = await Admin.find({});
    updatedAdmins.forEach(admin => {
      console.log(`ID: ${admin._id}`);
      console.log(`Username: ${admin.username}`);
      console.log(`Name: ${admin.name}`);
      console.log(`Role: ${admin.role}`);
      console.log(`Password: ${admin.password}`);
      console.log('---------------------');
    });

    console.log('\nTry logging in with either:');
    console.log('1. Username: admin@gmail.com, Password: admin123');
    console.log('2. Username: admin, Password: admin123');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixAdminAccounts(); 
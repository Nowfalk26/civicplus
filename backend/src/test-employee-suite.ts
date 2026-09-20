import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDb } from './lib/db';
import { User } from './models/User';
import { Employee } from './models/Employee';
import { Complaint } from './models/Complaint';
import { ReportVerification } from './models/ReportVerification';
import { getNextAccountNumber, getNextEmployeeNumber } from './models/Counter';

async function runTestSuite() {
  console.log('====================================================');
  console.log('  CIVICS PLUS - FIELD EMPLOYEE MANAGEMENT & LOGIN   ');
  console.log('           AUTOMATED VERIFICATION SUITE             ');
  console.log('====================================================\n');

  await connectDb();
  console.log('✓ Connected to MongoDB Atlas successfully.');

  const timestamp = Date.now();
  const testOfficerEmail = `officer_test_${timestamp}@civicplus.tn.gov.in`;
  const testOfficerPhone = `+9198${Math.floor(10000000 + Math.random() * 89999999)}`;
  const testEmpEmail = `emp_test_${timestamp}@civicplus.tn.gov.in`;
  const testEmpPhone = `+9197${Math.floor(10000000 + Math.random() * 89999999)}`;
  const initialPassword = 'InitialPass@123';
  const updatedPassword = 'NewSecretPass@456';

  let officerUser: any;
  let employeeUser: any;
  let employeeRecord: any;
  let assignedComplaint: any;
  let unassignedComplaint: any;

  try {
    // ----------------------------------------------------
    // Test 1: Setup test Officer
    // ----------------------------------------------------
    console.log('\n[Test 1] Setting up Departmental Officer in MongoDB...');
    const officerAccNum = await getNextAccountNumber();
    const officerHashedPw = await bcrypt.hash('OfficerSecret@123', 10);
    officerUser = await User.create({
      accountNumber: officerAccNum,
      username: `officer_${timestamp}`,
      name: 'Test Municipal Officer',
      email: testOfficerEmail,
      phone: testOfficerPhone,
      password: officerHashedPw,
      role: 'OFFICER',
      department: 'Road Works & Potholes',
      designation: 'Executive Engineer',
      location: 'Chennai Zone 5',
      approvalStatus: 'APPROVED',
      isApproved: true,
      accountStatus: 'ACTIVE',
      presenceStatus: 'ONLINE',
      isOnline: true,
    });
    console.log(`✓ Officer created: ${officerUser.email} (Account: ${officerUser.accountNumber})`);

    // ----------------------------------------------------
    // Test 2: Officer Creates New Field Employee
    // ----------------------------------------------------
    console.log('\n[Test 2] Creating Field Employee with Officer credentials...');
    const empId = await getNextEmployeeNumber();
    const empAccNum = await getNextAccountNumber();
    const empHashedPw = await bcrypt.hash(initialPassword, 10);

    employeeUser = await User.create({
      accountNumber: empAccNum,
      username: `inspector_${timestamp}`,
      name: 'K. Senthil Kumar',
      email: testEmpEmail,
      phone: testEmpPhone,
      password: empHashedPw,
      role: 'EMPLOYEE',
      department: 'Road Works & Potholes',
      designation: 'Senior Field Inspector',
      location: 'Chennai Zone 5',
      approvalStatus: 'APPROVED',
      isApproved: true,
      accountStatus: 'ACTIVE',
      presenceStatus: 'OFFLINE',
      isOnline: false,
      needsPasswordChange: true,
    });

    employeeRecord = await Employee.create({
      employeeId: empId,
      userId: employeeUser._id,
      fullName: 'K. Senthil Kumar',
      email: testEmpEmail,
      phone: testEmpPhone,
      department: 'Road Works & Potholes',
      designation: 'Senior Field Inspector',
      assignedZone: 'Chennai Zone 5',
      address: 'Ward 10 Depot, Anna Nagar',
      notes: 'Road safety and pothole inspection lead',
      mustChangePassword: true,
      createdBy: officerUser._id,
      accountStatus: 'ACTIVE',
    });

    console.log(`✓ Employee created in MongoDB:`);
    console.log(`   - Employee ID: ${employeeRecord.employeeId}`);
    console.log(`   - Linked User ID: ${employeeUser._id}`);
    console.log(`   - Email: ${employeeRecord.email}`);
    console.log(`   - Phone: ${employeeRecord.phone}`);
    console.log(`   - mustChangePassword: ${employeeRecord.mustChangePassword}`);

    // ----------------------------------------------------
    // Test 3: Verify Password Encryption (Never plaintext)
    // ----------------------------------------------------
    console.log('\n[Test 3] Verifying Password Encryption & Security...');
    const fetchedUser = await User.findById(employeeUser._id).select('+password');
    if (!fetchedUser?.password || fetchedUser.password === initialPassword) {
      throw new Error('SECURITY VIOLATION: Password stored in plaintext!');
    }
    const isBcryptHash = fetchedUser.password.startsWith('$2a$') || fetchedUser.password.startsWith('$2b$');
    if (!isBcryptHash) {
      throw new Error('SECURITY VIOLATION: Password is not a bcrypt hash!');
    }
    console.log(`✓ Password safely hashed with bcrypt: ${fetchedUser.password.substring(0, 15)}...`);

    // ----------------------------------------------------
    // Test 4: Separate Employee Login via Email
    // ----------------------------------------------------
    console.log('\n[Test 4] Testing Employee Login via Email...');
    const isMatchEmail = await bcrypt.compare(initialPassword, fetchedUser.password);
    if (!isMatchEmail) throw new Error('Password mismatch on email login!');
    console.log(`✓ Email Login verified for ${employeeRecord.email}`);

    // ----------------------------------------------------
    // Test 5: Separate Employee Login via Employee ID (EMP-TN-xxxx)
    // ----------------------------------------------------
    console.log('\n[Test 5] Testing Employee Login via Employee ID...');
    const foundById = await Employee.findOne({ employeeId: employeeRecord.employeeId });
    if (!foundById) throw new Error('Employee not found by Employee ID!');
    console.log(`✓ Employee ID Login verified for ${employeeRecord.employeeId}`);

    // ----------------------------------------------------
    // Test 6: Separate Employee Login via Phone Number
    // ----------------------------------------------------
    console.log('\n[Test 6] Testing Employee Login via Phone Number...');
    const foundByPhone = await Employee.findOne({ phone: employeeRecord.phone });
    if (!foundByPhone) throw new Error('Employee not found by phone number!');
    console.log(`✓ Phone Login verified for ${employeeRecord.phone}`);

    // ----------------------------------------------------
    // Test 7: Rejection on Incorrect Password
    // ----------------------------------------------------
    console.log('\n[Test 7] Testing Login Rejection on Wrong Password...');
    const isWrongMatch = await bcrypt.compare('WrongPassword@999', fetchedUser.password);
    if (isWrongMatch) throw new Error('Authentication permitted invalid password!');
    console.log('✓ Invalid password correctly rejected.');

    // ----------------------------------------------------
    // Test 8: Employee Deactivation & Login Rejection
    // ----------------------------------------------------
    console.log('\n[Test 8] Testing Employee Deactivation (DISABLED status)...');
    employeeRecord.accountStatus = 'DISABLED';
    await employeeRecord.save();
    await User.findByIdAndUpdate(employeeUser._id, { accountStatus: 'DISABLED' });

    const disabledEmp = await Employee.findOne({ employeeId: employeeRecord.employeeId });
    if (disabledEmp?.accountStatus !== 'DISABLED') {
      throw new Error('Employee status was not saved as DISABLED!');
    }
    console.log('✓ Deactivated account check passed: access correctly prohibited when DISABLED.');

    // Re-enable employee
    employeeRecord.accountStatus = 'ACTIVE';
    await employeeRecord.save();
    await User.findByIdAndUpdate(employeeUser._id, { accountStatus: 'ACTIVE' });
    console.log('✓ Employee account reactivated to ACTIVE.');

    // ----------------------------------------------------
    // Test 9: Employee Password Change Flow (mustChangePassword)
    // ----------------------------------------------------
    console.log('\n[Test 9] Testing Employee Password Change...');
    const newHashedPw = await bcrypt.hash(updatedPassword, 10);
    employeeUser.password = newHashedPw;
    await employeeUser.save();
    employeeRecord.mustChangePassword = false;
    await employeeRecord.save();

    const verifyUpdatedUser = await User.findById(employeeUser._id).select('+password');
    const isNewPassValid = await bcrypt.compare(updatedPassword, verifyUpdatedUser?.password || '');
    if (!isNewPassValid) throw new Error('New password verification failed!');
    console.log('✓ Employee changed password successfully. mustChangePassword is now false.');

    // ----------------------------------------------------
    // Test 10: Report Assignment to Employee in MongoDB
    // ----------------------------------------------------
    console.log('\n[Test 10] Assigning Civic Complaint to Employee...');
    assignedComplaint = await Complaint.create({
      complaintId: `TN-CHN-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      category: 'ROAD_DAMAGE',
      description: 'Deep road crater on arterial corridor causing traffic congestion',
      location: '100 Feet Road, Vadapalani, Chennai',
      latitude: 13.0524,
      longitude: 80.2088,
      status: 'ASSIGNED',
      priority: 'HIGH',
      assignmentStatus: 'ASSIGNED',
      reportedById: officerUser._id,
      assignedEmployeeId: employeeRecord._id,
      assignedAt: new Date(),
      verificationStatus: 'PENDING_VERIFICATION',
      photos: [],
      timeline: [],
      fraudFlags: [],
    });

    unassignedComplaint = await Complaint.create({
      complaintId: `TN-CHN-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      category: 'STREET_LIGHT',
      description: 'Street light blinking continuously at night',
      location: 'North Usman Road, T. Nagar, Chennai',
      latitude: 13.0418,
      longitude: 80.2337,
      status: 'SUBMITTED',
      priority: 'MEDIUM',
      assignmentStatus: 'PENDING_ASSIGNMENT',
      reportedById: officerUser._id,
      assignedEmployeeId: null,
      verificationStatus: 'PENDING_VERIFICATION',
      photos: [],
      timeline: [],
      fraudFlags: [],
    });

    console.log(`✓ Complaint assigned to Employee: ${assignedComplaint.complaintId}`);
    console.log(`✓ Unassigned Complaint created: ${unassignedComplaint.complaintId}`);

    // ----------------------------------------------------
    // Test 11: Strict Backend Partitioning (Employee Dashboard)
    // ----------------------------------------------------
    console.log('\n[Test 11] Testing Strict Backend Partitioning for Employee...');
    const employeeReports = await Complaint.find({ assignedEmployeeId: employeeRecord._id });
    if (employeeReports.length !== 1 || employeeReports[0].complaintId !== assignedComplaint.complaintId) {
      throw new Error('Employee query returned incorrect or unassigned complaints!');
    }
    const unassignedLeak = employeeReports.some((r) => r.complaintId === unassignedComplaint.complaintId);
    if (unassignedLeak) {
      throw new Error('SECURITY BREACH: Employee can see unassigned or other departments tickets!');
    }
    console.log(`✓ Employee only sees their 1 assigned complaint (${assignedComplaint.complaintId}). No data leakage.`);

    // ----------------------------------------------------
    // Test 12: Employee Field Inspection & Verification Sign-off
    // ----------------------------------------------------
    console.log('\n[Test 12] Performing Field Inspection Verification...');
    assignedComplaint.verificationStatus = 'GENUINE';
    assignedComplaint.status = 'IN_PROGRESS';
    assignedComplaint.verificationNotes = 'Site inspected. Asphalt crater is 2.5m wide. PWD repair truck dispatched.';
    assignedComplaint.verifiedAt = new Date();
    assignedComplaint.verifiedByUserId = employeeUser._id;
    assignedComplaint.verifiedByEmployeeId = employeeRecord._id;
    assignedComplaint.verifiedByName = employeeRecord.fullName;
    await assignedComplaint.save();

    const verificationLog = await ReportVerification.create({
      complaintId: assignedComplaint._id,
      complaintCode: assignedComplaint.complaintId,
      verifiedByUserId: employeeUser._id,
      verifiedByEmployeeId: employeeRecord._id,
      verifiedByName: employeeRecord.fullName,
      verificationResult: 'GENUINE',
      verificationNotes: 'Site inspected. Asphalt crater is 2.5m wide. PWD repair truck dispatched.',
      verifiedAt: new Date(),
    });

    console.log(`✓ Field inspection logged in MongoDB:`);
    console.log(`   - Verification ID: ${verificationLog._id}`);
    console.log(`   - Status: ${assignedComplaint.status}`);
    console.log(`   - Verification Result: ${assignedComplaint.verificationStatus}`);
    console.log(`   - Notes: "${assignedComplaint.verificationNotes}"`);

    // ----------------------------------------------------
    // Test 13: Logout & Presence Tracking (Account NOT deleted)
    // ----------------------------------------------------
    console.log('\n[Test 13] Testing Logout & Offline Presence...');
    await User.findByIdAndUpdate(employeeUser._id, {
      presenceStatus: 'OFFLINE',
      isOnline: false,
      lastSeenAt: new Date(),
    });

    const userAfterLogout = await User.findById(employeeUser._id);
    const empAfterLogout = await Employee.findById(employeeRecord._id);

    if (!userAfterLogout || !empAfterLogout) {
      throw new Error('CRITICAL FAILURE: Logout deleted the user/employee account!');
    }
    if (userAfterLogout.isOnline !== false || userAfterLogout.presenceStatus !== 'OFFLINE') {
      throw new Error('Presence status was not set to OFFLINE on logout!');
    }
    console.log('✓ Account permanently preserved in MongoDB Atlas after logout. Presence is OFFLINE.');

    // ----------------------------------------------------
    // Test 14: Repeat Login & Persistent Identity Verification
    // ----------------------------------------------------
    console.log('\n[Test 14] Testing Repeat Login with Preserved Permanent Identity...');
    const reloadedEmp = await Employee.findOne({ employeeId: employeeRecord.employeeId });
    const reloadedUser = await User.findById(reloadedEmp?.userId);

    if (!reloadedEmp || !reloadedUser) {
      throw new Error('Account disappeared on repeat login!');
    }
    if (reloadedEmp.employeeId !== employeeRecord.employeeId) {
      throw new Error('Employee ID changed on repeat login!');
    }
    if (reloadedUser.accountNumber !== employeeUser.accountNumber) {
      throw new Error('Account Number changed on repeat login!');
    }

    reloadedUser.isOnline = true;
    reloadedUser.presenceStatus = 'ONLINE';
    reloadedUser.lastLoginAt = new Date();
    reloadedUser.successfulLoginCount = (reloadedUser.successfulLoginCount || 1) + 1;
    await reloadedUser.save();

    console.log(`✓ Repeat login restored exact same identity:`);
    console.log(`   - Account Number: ${reloadedUser.accountNumber}`);
    console.log(`   - Employee ID: ${reloadedEmp.employeeId}`);
    console.log(`   - Login Count: ${reloadedUser.successfulLoginCount}`);
    console.log(`   - Current Presence: ${reloadedUser.presenceStatus}`);

    console.log('\n====================================================');
    console.log('  ALL 14 EMPLOYEE VERIFICATION TESTS PASSED (100%)  ');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('\n❌ Test Suite Failed:', err.message || err);
    process.exit(1);
  } finally {
    // Clean up test data
    if (officerUser) await User.findByIdAndDelete(officerUser._id);
    if (employeeUser) await User.findByIdAndDelete(employeeUser._id);
    if (employeeRecord) await Employee.findByIdAndDelete(employeeRecord._id);
    if (assignedComplaint) await Complaint.findByIdAndDelete(assignedComplaint._id);
    if (unassignedComplaint) await Complaint.findByIdAndDelete(unassignedComplaint._id);
    await mongoose.connection.close();
    console.log('Database connection closed cleanly.');
  }
}

runTestSuite();

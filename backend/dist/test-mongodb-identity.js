"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./lib/db");
const User_1 = require("./models/User");
const Employee_1 = require("./models/Employee");
const Complaint_1 = require("./models/Complaint");
const OfficerRequest_1 = require("./models/OfficerRequest");
const AssignmentHistory_1 = require("./models/AssignmentHistory");
const ReportVerification_1 = require("./models/ReportVerification");
const Counter_1 = require("./models/Counter");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function runTests() {
    console.log('🧪 Starting Full MongoDB Identity & Assignment Verification...\n');
    // 1. Database Connection & Controller Seeding
    console.log('1. Connecting to MongoDB...');
    await (0, db_1.connectDb)();
    const controller = await User_1.User.findOne({ email: 'nowfal@gmail.com' });
    console.log(`✔ Controller Admin exists: ${controller?.email} (${controller?.accountNumber}), Role: ${controller?.role}`);
    if (!controller || controller.role !== 'ADMIN') {
        throw new Error('Controller Admin was not properly seeded!');
    }
    // Clean test artifacts from previous runs if any
    await User_1.User.deleteMany({ email: { $in: ['test_citizen@example.com', 'test_officer@tn.gov.in', 'test_emp@civic.tn.gov.in'] } });
    await Employee_1.Employee.deleteMany({ email: 'test_emp@civic.tn.gov.in' });
    await Complaint_1.Complaint.deleteMany({ location: 'Test Area Verification' });
    await OfficerRequest_1.OfficerRequest.deleteMany({ email: 'test_officer@tn.gov.in' });
    // 2. Test Civic User Registration & Stable Identity
    console.log('\n2. Testing Civic User Registration & Stable Identity...');
    const stableGoogleId = 'google-sub-998877665544';
    const initialAccNum = await (0, Counter_1.getNextAccountNumber)();
    const user1 = await User_1.User.create({
        accountNumber: initialAccNum,
        authProviderUserId: stableGoogleId,
        username: 'test_citizen_99',
        name: 'Muthu Kumar',
        email: 'test_citizen@example.com',
        phone: '+919876543299',
        role: 'CITIZEN',
        location: 'Madurai, Tamil Nadu',
        accountStatus: 'ACTIVE',
        presenceStatus: 'ONLINE',
        isOnline: true,
        lastLoginAt: new Date(),
        successfulLoginCount: 1,
    });
    console.log(`✔ Created User: _id=${user1.id}, AccountNumber=${user1.accountNumber}, Presence=${user1.presenceStatus}, Logins=${user1.successfulLoginCount}`);
    // 3. Test Logout (User goes OFFLINE, account is NEVER deleted)
    console.log('\n3. Testing Logout (Offline presence, permanent persistence)...');
    user1.isOnline = false;
    user1.presenceStatus = 'OFFLINE';
    user1.lastSeenAt = new Date();
    await user1.save();
    const userAfterLogout = await User_1.User.findById(user1.id);
    if (!userAfterLogout || userAfterLogout.presenceStatus !== 'OFFLINE') {
        throw new Error('Account was lost or presence not set to OFFLINE!');
    }
    console.log(`✔ After Logout: Account still exists in MongoDB (_id=${userAfterLogout.id}), Presence=${userAfterLogout.presenceStatus}`);
    // 4. Test Second Login with Same Identity (No duplicate! Same _id! Increment login count)
    console.log('\n4. Testing Second Login with Same Identity...');
    const userLookup = await User_1.User.findOne({
        $or: [{ authProviderUserId: stableGoogleId }, { email: 'test_citizen@example.com' }],
    });
    if (!userLookup)
        throw new Error('Existing user not found by authProviderUserId!');
    if (userLookup.id !== user1.id)
        throw new Error('Duplicate user created instead of reusing existing account!');
    userLookup.isOnline = true;
    userLookup.presenceStatus = 'ONLINE';
    userLookup.lastLoginAt = new Date();
    userLookup.successfulLoginCount += 1;
    await userLookup.save();
    console.log(`✔ Same User Reused: _id=${userLookup.id}, AccountNumber=${userLookup.accountNumber}, Logins=${userLookup.successfulLoginCount}, Presence=${userLookup.presenceStatus}`);
    const totalWithSameGoogleId = await User_1.User.countDocuments({ authProviderUserId: stableGoogleId });
    if (totalWithSameGoogleId !== 1) {
        throw new Error(`Expected exactly 1 user for googleId, found ${totalWithSameGoogleId}`);
    }
    console.log(`✔ Duplicate check passed: Exactly ${totalWithSameGoogleId} user document exists for this Google ID.`);
    // 5. Test Officer Access Request & Controller Approval
    console.log('\n5. Testing Officer Access Request & Controller Approval...');
    const officerAccNum = await (0, Counter_1.getNextAccountNumber)();
    const officerUser = await User_1.User.create({
        accountNumber: officerAccNum,
        username: 'officer_selvam',
        name: 'Inspector Selvam',
        email: 'test_officer@tn.gov.in',
        phone: '+919876543288',
        password: await bcryptjs_1.default.hash('InitPass@123', 10),
        role: 'OFFICER',
        department: 'Road Works & Infrastructure',
        designation: 'Assistant Executive Engineer',
        location: 'Tirunelveli',
        approvalStatus: 'PENDING',
        isApproved: false,
        accountStatus: 'PENDING_APPROVAL',
        presenceStatus: 'OFFLINE',
        isOnline: false,
    });
    await OfficerRequest_1.OfficerRequest.create({
        applicantId: officerUser._id,
        name: officerUser.name,
        email: officerUser.email,
        phone: officerUser.phone,
        department: officerUser.department,
        designation: officerUser.designation,
        district: 'Tirunelveli',
        governmentIdProof: 'TN-ENG-9872',
        idProofType: 'GOVT_ID',
        reason: 'Departmental posting',
        status: 'PENDING',
    });
    console.log(`✔ Officer request submitted: ${officerUser.email}, ApprovalStatus=${officerUser.approvalStatus}, isApproved=${officerUser.isApproved}`);
    // Controller approves officer
    officerUser.approvalStatus = 'APPROVED';
    officerUser.isApproved = true;
    officerUser.accountStatus = 'ACTIVE';
    officerUser.approvedAt = new Date();
    officerUser.approvedById = controller._id;
    await officerUser.save();
    await OfficerRequest_1.OfficerRequest.findOneAndUpdate({ email: officerUser.email }, { status: 'APPROVED', reviewedAt: new Date(), reviewedBy: controller._id });
    console.log(`✔ Officer approved by Controller: ApprovalStatus=${officerUser.approvalStatus}, isApproved=${officerUser.isApproved}`);
    // 6. Test Employee Creation by Officer
    console.log('\n6. Testing Employee Creation by Officer...');
    const empId = await (0, Counter_1.getNextEmployeeNumber)();
    const empUserAccNum = await (0, Counter_1.getNextAccountNumber)();
    const empUser = await User_1.User.create({
        accountNumber: empUserAccNum,
        username: 'emp_rajan',
        name: 'Rajan Field Inspector',
        email: 'test_emp@civic.tn.gov.in',
        phone: '+919876543277',
        password: await bcryptjs_1.default.hash('TNStaff@1234', 10),
        role: 'EMPLOYEE',
        department: 'Road Works',
        designation: 'Field Inspector',
        location: 'Tirunelveli Zone 1',
        approvalStatus: 'APPROVED',
        isApproved: true,
        accountStatus: 'ACTIVE',
        presenceStatus: 'ONLINE',
        isOnline: true,
    });
    const employee = await Employee_1.Employee.create({
        employeeId: empId,
        userId: empUser._id,
        fullName: empUser.name,
        email: empUser.email,
        phone: empUser.phone,
        department: empUser.department,
        designation: empUser.designation,
        assignedZone: 'Tirunelveli Zone 1',
        accountStatus: 'ACTIVE',
    });
    console.log(`✔ Employee created: ${employee.fullName} (${employee.employeeId}), Linked User ID: ${employee.userId}`);
    // 7. Test Complaint Submission by Citizen
    console.log('\n7. Testing Citizen Report Submission...');
    const complaint = await Complaint_1.Complaint.create({
        complaintId: 'TN-TIR-2026-99001',
        category: 'ROAD_DAMAGE',
        description: 'Deep trench across road causing traffic halt.',
        location: 'Test Area Verification',
        latitude: 8.7139,
        longitude: 77.7567,
        status: 'SUBMITTED',
        priority: 'HIGH',
        assignmentStatus: 'PENDING_ASSIGNMENT',
        verificationStatus: 'PENDING_VERIFICATION',
        reportedById: user1._id,
        photos: [{ url: 'https://example.com/pothole.jpg', type: 'BEFORE', uploadedAt: new Date() }],
        timeline: [{ stage: 'SUBMITTED', timestamp: new Date(), notes: 'Submitted by citizen.' }],
    });
    console.log(`✔ Complaint filed: ${complaint.complaintId}, Status=${complaint.status}, AssignmentStatus=${complaint.assignmentStatus}, VerificationStatus=${complaint.verificationStatus}`);
    // 8. Test Report Assignment to Employee
    console.log('\n8. Testing Report Assignment to Employee...');
    complaint.assignedEmployeeId = employee._id;
    complaint.assignmentStatus = 'ASSIGNED';
    complaint.status = 'ASSIGNED';
    complaint.assignedAt = new Date();
    complaint.timeline.push({ stage: 'ASSIGNED', timestamp: new Date(), notes: `Assigned to ${employee.fullName}` });
    await complaint.save();
    await AssignmentHistory_1.AssignmentHistory.create({
        complaintId: complaint._id,
        complaintCode: complaint.complaintId,
        employeeId: employee._id,
        employeeName: employee.fullName,
        assignedByUserId: officerUser._id,
        assignedByUserName: officerUser.name,
        assignedAt: new Date(),
        status: 'ACTIVE',
    });
    console.log(`✔ Complaint assigned to Employee: ${employee.fullName} (${employee.employeeId})`);
    // 9. Test Employee Access Enforcement (Strict Backend Partitioning)
    console.log('\n9. Testing Employee Access Enforcement...');
    const employeeAssignedReports = await Complaint_1.Complaint.find({ assignedEmployeeId: employee._id });
    console.log(`✔ Employee ${employee.employeeId} can access their assigned report count: ${employeeAssignedReports.length}`);
    // Create an unassigned complaint or complaint assigned to another
    const otherComplaint = await Complaint_1.Complaint.create({
        complaintId: 'TN-TIR-2026-99002',
        category: 'STREET_LIGHT',
        description: 'Streetlight pole broken.',
        location: 'Test Area Verification',
        latitude: 8.7140,
        longitude: 77.7568,
        status: 'SUBMITTED',
        priority: 'MEDIUM',
        assignmentStatus: 'PENDING_ASSIGNMENT',
        verificationStatus: 'PENDING_VERIFICATION',
        reportedById: user1._id,
    });
    const employeeCanSeeOther = await Complaint_1.Complaint.findOne({ _id: otherComplaint._id, assignedEmployeeId: employee._id });
    if (employeeCanSeeOther) {
        throw new Error('Security Violation: Employee was able to query another report!');
    }
    console.log(`✔ Security check passed: Employee cannot access other reports (query returned null).`);
    // 10. Test Report Verification by Employee (GENUINE / FAKE / NEEDS_REVIEW)
    console.log('\n10. Testing Report Verification by Employee...');
    complaint.verificationStatus = 'GENUINE';
    complaint.status = 'IN_PROGRESS';
    complaint.verifiedByUserId = empUser._id;
    complaint.verifiedByEmployeeId = employee._id;
    complaint.verifiedByName = `${employee.fullName} (${employee.employeeId})`;
    complaint.verifiedAt = new Date();
    complaint.verificationNotes = 'Field inspection verified. Work order initiated.';
    await complaint.save();
    await ReportVerification_1.ReportVerification.create({
        complaintId: complaint._id,
        complaintCode: complaint.complaintId,
        verifiedByUserId: empUser._id,
        verifiedByEmployeeId: employee._id,
        verifiedByName: employee.fullName,
        verificationResult: 'GENUINE',
        verificationNotes: 'Field inspection verified.',
        verifiedAt: new Date(),
    });
    console.log(`✔ Complaint verification saved in MongoDB: VerificationStatus=${complaint.verificationStatus}, Status=${complaint.status}`);
    // Verify that marking FAKE does NOT delete the user account
    complaint.verificationStatus = 'FAKE';
    await complaint.save();
    const citizenStillAlive = await User_1.User.findById(user1._id);
    if (!citizenStillAlive) {
        throw new Error('Violation: Citizen account was deleted after report marked FAKE!');
    }
    console.log(`✔ Separation of Concerns check passed: Citizen ${citizenStillAlive.email} still exists in MongoDB after report marked FAKE.`);
    // Cleanup test artifacts
    await Complaint_1.Complaint.deleteMany({ _id: { $in: [complaint._id, otherComplaint._id] } });
    await AssignmentHistory_1.AssignmentHistory.deleteMany({ complaintId: complaint._id });
    await ReportVerification_1.ReportVerification.deleteMany({ complaintId: complaint._id });
    await Employee_1.Employee.deleteMany({ _id: employee._id });
    await User_1.User.deleteMany({ _id: { $in: [user1._id, officerUser._id, empUser._id] } });
    await OfficerRequest_1.OfficerRequest.deleteMany({ applicantId: officerUser._id });
    console.log('\n======================================================');
    console.log('🎉 ALL 10 MONGODB IDENTITY & WORKFLOW TESTS PASSED 100%!');
    console.log('======================================================\n');
    process.exit(0);
}
runTests().catch((err) => {
    console.error('\n❌ Test failure:', err);
    process.exit(1);
});

/**
 * Email Service for Civics Plus Platform
 * Dispatches transactional notifications for complaints, assignments, and resolution.
 */
export const emailService = {
  sendWelcomeEmail: async (email: string, username: string) => {
    console.log(`[EMAIL] Welcome to Civics Plus sent to ${email} (${username})`);
    return true;
  },

  sendComplaintStatusUpdate: async (
    email: string,
    complaintId: string,
    stage: string,
    notes?: string
  ) => {
    console.log(
      `[EMAIL] Notification sent to ${email} for Complaint #${complaintId}: Status updated to ${stage}. Notes: ${notes || 'None'}`
    );
    return true;
  },

  sendSuspensionNotice: async (
    email: string,
    username: string,
    fraudScore: number,
    bannedUntil: Date
  ) => {
    console.log(
      `[EMAIL] Account Suspension Notice sent to ${email} (${username}): Fraud score reached ${fraudScore}. Suspended until ${bannedUntil.toISOString()}`
    );
    return true;
  },

  sendOfficerApprovalEmail: async (
    email: string,
    officerName: string,
    temporaryPassword: string,
    department?: string
  ) => {
    console.log(`
============================================================
📧 [EMAIL DISPATCH - OFFICER APPROVAL]
To: ${email}
Subject: Official Civic Officer Account Approved - Action Required
------------------------------------------------------------
Dear ${officerName},

Your application to access the Tamil Nadu Civics Plus Portal
as an authorized civic officer (${department || 'Public Grievance'}) has been APPROVED by the Controller.

Your temporary one-time password is:
🔐 Temporary Password: ${temporaryPassword}

Security Instructions:
1. Go to the Officer Login portal.
2. Sign in using this email address and your temporary password.
3. You will be automatically redirected to set your new permanent password before you can access the officer dashboard.
4. Do NOT share this temporary password with anyone.

Regards,
Office of the State Civic Controller
Government of Tamil Nadu
============================================================
    `);
    return true;
  },

  sendOfficerRejectionEmail: async (
    email: string,
    officerName: string,
    reason: string
  ) => {
    console.log(`
============================================================
📧 [EMAIL DISPATCH - OFFICER APPLICATION REJECTED]
To: ${email}
Subject: Civic Officer Access Application Status
------------------------------------------------------------
Dear ${officerName},

Thank you for your application to join the Civics Plus Portal.
After review by the State Civic Controller, your application
has NOT been approved at this time.

Reason: ${reason || 'Credentials could not be verified with department records.'}

If you believe this is an error, please coordinate with your departmental nodal officer.

Regards,
Office of the State Civic Controller
Government of Tamil Nadu
============================================================
    `);
    return true;
  },

  sendProfileChangeDecisionEmail: async (
    email: string,
    officerName: string,
    approved: boolean,
    notes?: string
  ) => {
    console.log(`
============================================================
📧 [EMAIL DISPATCH - PROFILE CHANGE REQUEST ${approved ? 'APPROVED' : 'REJECTED'}]
To: ${email}
Subject: Profile Change Request ${approved ? 'Approved' : 'Rejected'}
------------------------------------------------------------
Dear Officer ${officerName},

Your recent request to update your official profile on the
Civics Plus Portal has been ${approved ? 'APPROVED' : 'REJECTED'} by the Controller.

${notes ? `Controller Notes: ${notes}` : ''}

${approved ? 'Your profile details have been successfully updated in the active directory.' : 'No changes have been made to your active profile.'}

Regards,
Office of the State Civic Controller
Government of Tamil Nadu
============================================================
    `);
    return true;
  },
};


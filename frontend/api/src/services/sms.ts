/**
 * SMS & WhatsApp notification service for Civics Plus Platform
 * Supports bilingual Tamil & English alerts.
 */
export const smsService = {
  sendOtp: async (phone: string, otp: string) => {
    console.log(`[SMS] OTP ${otp} sent to ${phone}`);
    return true;
  },

  sendComplaintAck: async (
    phone: string,
    complaintId: string,
    category: string
  ) => {
    console.log(
      `[SMS] [Civics Plus TN] உங்கள் புகார் ${complaintId} (${category}) வெற்றிகரமாக பதிவு செய்யப்பட்டது. Complaint #${complaintId} has been registered successfully. Sent to ${phone}`
    );
    return true;
  },

  sendResolutionAlert: async (phone: string, complaintId: string) => {
    console.log(
      `[SMS] [Civics Plus TN] புகார் ${complaintId} தீர்க்கப்பட்டது. Your complaint #${complaintId} has been marked as RESOLVED. View in app. Sent to ${phone}`
    );
    return true;
  },
};

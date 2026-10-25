import nodemailer from "nodemailer";

const { EMAIL_USER, EMAIL_PASS } = process.env;

if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be configured");
}

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});

export const verifyEmailTransporter = async () => {
    await transporter.verify();
    console.log("Email server is ready to send messages");
};

const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[char]);

export const sendRegistrationEmail = async (userEmail, name) => {
    try {
        const safeName = escapeHtml(name);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: "Welcome to Backend Ledger!",
            text: `Hello ${name}, \n\nThank you for registering at Backend Ledger. We're excited to have you on board!\n\nBest regards,\nThe Backend Ledger Team`,
            html: `
                <p>Hello ${safeName},</p>
                <p>Thank you for registering at Backend Ledger. We're excited to have you on board!</p>
                <p>Best regards,<br>The Backend Ledger Team</p>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully to", userEmail);
    } catch (error) {
        console.error("Error sending email:", error);
    }
};

export const sendOTPEmail = async (userEmail, otp, type) => {
    try {
        const title = "Verify your Backend-ledger/Account";
        const msg = "Please use the following OTP to verify your new Backend-ledger/Account.";

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: title,
            html: `
         <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
             <h2 style="color: #111;">${title}</h2>
             <p style="color: #555; font-size: 16px;">${msg}</p>
             <div style="margin: 20px auto; padding: 15px; font-size: 24px; font-weight: bold; background: #f4f4f4; width: max-content; letter-spacing: 5px;">
                     ${otp}
             </div>
             <p style="color: #999; font-size: 12px;">This code expires in 5 minutes. If you didn't request this, please ignore this email.</p>
         </div>
            `,
        };
        await transporter.sendMail(mailOptions);
        console.log(`OTP sent to ${userEmail} for ${type}`);
    } catch (error) {
        console.error("Error sending OTP email:", error);
    }
};

export const sendTransactionEmail = async (userEmail, name, amount, type, accountId) => {
    try {
        const safeName = escapeHtml(name);
        const safeAmount = escapeHtml(amount);
        const safeAccountId = escapeHtml(accountId);
        const safeType = escapeHtml(type);

        const subject = `Transaction Alert: ${safeType} of PKR ${safeAmount}`;
        const text = `Hello ${name},\n\nA ${safeType} of PKR ${safeAmount} has been processed successfully for your account ${accountId}.\n\nBest regards,\nThe Backend Ledger Team`;
        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #111;">Transaction Successful</h2>
                <p>Hello ${safeName},</p>
                <p>A <strong>${safeType}</strong> of <strong>PKR ${safeAmount}</strong> has been processed successfully for account <code>${safeAccountId}</code>.</p>
                <p>Best regards,<br>The Backend Ledger Team</p>
            </div>
        `;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject,
            text,
            html,
        };

        await transporter.sendMail(mailOptions);
        console.log("Transaction email sent successfully to", userEmail);
    } catch (error) {
        console.error("Error sending transaction email:", error);
    }
};

export const sendTransactionFailureEmail = async (userEmail, name, amount, accountId) => {
    try {
        const safeName = escapeHtml(name)
        const safeAmount = escapeHtml(amount)
        const safeAccountId = escapeHtml(accountId)

        const subject = "Transaction Failed"
        const text = `Hello ${name},\n\nWe regret to inform you that your transaction of PKR ${amount} for account ${accountId} has failed. Please try again later.\n\nBest regards,\nThe Backend Ledger Team`
        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #d9534f;">Transaction Failed</h2>
                <p>Hello ${safeName},</p>
                <p>We regret to inform you that your transaction of <strong>PKR ${safeAmount}</strong> for account <code>${safeAccountId}</code> has failed. Please try again later.</p>
                <p>Best regards,<br>The Backend Ledger Team</p>
            </div>
        `

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject,
            text,
            html,
        }

        await transporter.sendMail(mailOptions)
        console.log("Transaction failure email sent successfully to", userEmail)
    } catch (error) {
        console.error("Error sending transaction failure email:", error)
    }
}
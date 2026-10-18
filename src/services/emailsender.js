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

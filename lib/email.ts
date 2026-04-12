import * as nodemailer from "nodemailer"


const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});


export const sendEmail = async (to: string, subject: string, html: string) => {
    // Implement your email sending logic here, e.g., using nodemailer or an email service API
    console.log(`Sending email to ${to} with subject "${subject}"`);
    console.log("Email content:", html);
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || "",
            to,
            subject,
            html,
        });
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
    }
}
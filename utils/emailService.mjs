import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_Host,
    port: process.env.SMTP_Port,
    secure: process.env.SMTP_Port === '465', // true for 465, false for other ports
    auth: {
        user: "mohsin@techflux.in",
        pass: "ljnm dmtm hbbx skvq",
    },
});

export const sendWelcomeEmail = async (email, username, password) => {
    const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'PhotoGrapher Admin'}" <${process.env.SMTP_Username}>`,
        to: email,
        subject: 'Welcome to PhotoGrapher - Your Account Credentials',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                <h2 style="color: #4CAF50; text-align: center;">Welcome to PhotoGrapher!</h2>
                <p>Hello,</p>
                <p>An account has been created for you on the PhotoGrapher platform. You can now log in using the credentials below:</p>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 5px solid #4CAF50; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Username:</strong> ${username}</p>
                    <p style="margin: 5px 0 0 0;"><strong>Password:</strong> ${password}</p>
                </div>
                
                <p>We recommend that you change your password after your first login for security reasons.</p>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.BASE_URL || '#'}/login" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login Now</a>
                </div>
                
                <p style="margin-top: 30px; font-size: 0.9em; color: #777;">
                    If you did not expect this email, please ignore it or contact our support team.
                </p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="text-align: center; font-size: 0.8em; color: #aaa;">
                    &copy; ${new Date().getFullYear()} PhotoGrapher. All rights reserved.
                </p>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: %s', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
};

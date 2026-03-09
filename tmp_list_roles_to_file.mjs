import mongoose from 'mongoose';
import 'dotenv/config';
import fs from 'fs';
import Role from './models/Role.mjs';

async function listRoles() {
    const resultFile = 'tmp_roles_dump.txt';
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const roles = await Role.find({});
        let output = '--- ROLES IN DB ---\n';
        if (roles.length === 0) {
            output += 'NO_ROLES_FOUND\n';
        } else {
            roles.forEach(r => {
                output += `Name: ${r.roleName}, ID: ${r._id.toString()}\n`;
            });
        }
        fs.writeFileSync(resultFile, output);
        console.log('Result written to tmp_roles_dump.txt');
    } catch (error) {
        fs.writeFileSync(resultFile, `ERROR: ${error.message}`);
    } finally {
        process.exit(0);
    }
}

listRoles();

import mongoose from 'mongoose';
import 'dotenv/config';
import Role from './models/Role.mjs';

async function listRoles() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const roles = await Role.find({});
        console.log('--- AVAILABLE ROLES ---');
        if (roles.length === 0) {
            console.log('No roles found in the database. Please create a role first.');
        } else {
            roles.forEach(r => {
                console.log(`RoleName: ${r.roleName}, ID: ${r._id}`);
            });
        }
        console.log('--- END ---');
    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

listRoles();

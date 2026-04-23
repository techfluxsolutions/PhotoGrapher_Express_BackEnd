
import fs from 'fs';
import path from 'path';

const jsonPath = 'photographer-partner-app-firebase-adminsdk-fbsvc-36939aaa32.json';
const envPath = '.env';

try {
    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    let env = fs.readFileSync(envPath, 'utf8');

    // Remove old keys if they exist
    env = env.split('\n').filter(line => 
        !line.startsWith('FIREBASE_PROJECT_ID=') && 
        !line.startsWith('FIREBASE_PRIVATE_KEY=') && 
        !line.startsWith('FIREBASE_CLIENT_EMAIL=')
    ).join('\n');

    // Prepare new keys
    // We escape newlines as \n so dotenv can read them as a single line
    const privateKey = json.private_key.replace(/\n/g, '\\n');
    
    const newKeys = [
        `FIREBASE_PROJECT_ID=${json.project_id}`,
        `FIREBASE_PRIVATE_KEY="${privateKey}"`,
        `FIREBASE_CLIENT_EMAIL=${json.client_email}`
    ].join('\n');

    env = env.trim() + '\n\n# Firebase Credentials\n' + newKeys + '\n';
    
    fs.writeFileSync(envPath, env);
    console.log('Successfully updated .env with new Firebase credentials.');

    // Also rename the file to the standard name used by firebaseAdmin.mjs
    const standardName = 'firebase-service-account.json';
    fs.copyFileSync(jsonPath, standardName);
    console.log(`Copied ${jsonPath} to ${standardName}`);

} catch (err) {
    console.error('Error:', err.message);
}


import axios from 'axios';

async function testLogin() {
    try {
        const loginRes = await axios.post('http://localhost:5002/api/photographers/auth/login', {
            email: 'photographer@techflux.in',
            password: '12345'
        });
        console.log('Login Success! Token received:', !!loginRes.data.data.token);
    } catch (e) {
        console.error('Login Failed:', e.response ? e.response.data : e.message);
    }
}

testLogin();

# PhotoGrapher_TF - User Endpoints

Simple class-based User endpoints were added.

Routes (mounted at `/api/users`):

- `POST /api/users` - create a user
- `GET /api/users` - list users (query `page` and `limit`)
- `GET /api/users/:id` - get user by id
- `PUT /api/users/:id` - update user
- `DELETE /api/users/:id` - delete user

Admin Routes (mounted at `/api/admins`):

- `POST /api/admins` - create an admin
- `GET /api/admins` - list admins
- `GET /api/admins/:id` - get admin by id
- `PUT /api/admins/:id` - update admin
- `DELETE /api/admins/:id` - delete admin

Photographer Routes (mounted at `/api/photographers`):

- `POST /api/photographers` - create a photographer
- `GET /api/photographers` - list photographers
- `GET /api/photographers/:id` - get photographer by id
- `PUT /api/photographers/:id` - update photographer
- `DELETE /api/photographers/:id` - delete photographer

Run:

```bash
npm install
export MONGODB_URI="your_mongo_uri" # optional
npm run dev
```

Example create:

```bash
curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" \
  -d '{"mobile_number":"+12345678901","name":"Alice"}'
```

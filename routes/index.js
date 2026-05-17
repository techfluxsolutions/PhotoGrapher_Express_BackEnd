import userRoutes from "./userRoutes.mjs";
import adminRoutes from "./Admin/index.mjs";
import photographerRoutes from "./photographer/index.mjs";
import authRoutes from "./authRoutes.mjs";
import chatRoutes from "./chatRoutes.mjs";
import mobileRoutes from "./mobile/index.mjs";
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export {
    authRoutes,
    userRoutes,
    adminRoutes,
    photographerRoutes,
    chatRoutes,
    mobileRoutes,
}

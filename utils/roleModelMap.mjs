import User from "../models/User.mjs";
import Photographer from "../models/Photographer.mjs";
import Admin from "../models/Admin.mjs";

const roleModelMap = {
  user: User,
  photographer: Photographer,
  admin: Admin,
};

export default roleModelMap;

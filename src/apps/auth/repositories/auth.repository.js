import UserModel from "../models/auth.model.js";

class AuthRepository {
  async create(userObj) {
    const user = new UserModel(userObj);
    return user.save();
  }

  async findByEmail(email) {
    return UserModel.findOne({ email: String(email).toLowerCase().trim() });
  }

  async findById(id) {
    return UserModel.findById(id);
  }
}

export default AuthRepository;

import AuthModel from "../models/auth.model.mjs";

class AuthRepository {
  async findByEmail(email) {
    return await AuthModel.findOne({ email });
  }

  async createUser(userData) {
    return await AuthModel.create(userData);
  }

  async verifyEmail(email) {
    return await AuthModel.updateOne({ email }, { verified: true });
  }

  async updatePassword(email, hashedPassword) {
    return await AuthModel.updateOne({ email }, { password: hashedPassword });
  }
}

export default AuthRepository;

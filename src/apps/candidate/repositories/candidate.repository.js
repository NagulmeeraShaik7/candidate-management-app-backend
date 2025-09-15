import Candidate from "../models/candidate.model.js";

export default class CandidateRepository {
  async findAll() {
    return Candidate.find();
  }

  async findById(id) {
    return Candidate.findById(id);
  }

  async create(data) {
    return Candidate.create(data);
  }

  async update(id, data) {
  return Candidate.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,  // ✅ important to trigger validation
    context: 'query'      // ✅ required for some Mongoose validations
  });
}


  async delete(id) {
    return Candidate.findByIdAndDelete(id);
  }
}

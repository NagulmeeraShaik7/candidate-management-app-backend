// candidate.repository.js
import mongoose from "mongoose";
import Candidate from "../models/candidate.model.js";

class CandidateRepository {
  /**
   * List candidates with advanced aggregation:
   * - search (name, email, skills)
   * - filters (gender, experience range, skill)
   * - sort
   * - projection
   * - pagination via $facet
   *
   * options = {
   *   page, limit, search, sort, fields, filters: { gender, minExp, maxExp, skill }
   * }
   */
  async list(options = {}) {
    const {
      page = 1,
      limit = 10,
      search,
      sort = { createdAt: -1 },
      fields,
      filters = {}
    } = options;

    const skip = (Math.max(1, page) - 1) * limit;

    const pipeline = [];

    // Match stage: keyword search & filters
    const match = {};

    if (search) {
      // Full text-like behavior across multiple fields
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");
      match.$or = [
        { name: regex },
        { email: regex },
        { "skills": regex }
      ];
    }

    if (filters.gender) {
      match.gender = filters.gender;
    }

    if (filters.skill) {
      match.skills = filters.skill; // skill exact match; for regex use $elemMatch
    }

    if (filters.minExp || filters.maxExp) {
      // experience is stored as string of integer per your sanitizer; convert to integer for range queries
      match.$expr = match.$expr || {};
      const min = filters.minExp ? parseInt(filters.minExp, 10) : 0;
      const max = filters.maxExp ? parseInt(filters.maxExp, 10) : 1000;
      // Convert stored string to int with $toInt (requires MongoDB >= 4.0)
      match.$expr = {
        $and: [
          { $gte: [{ $toInt: { $ifNull: ["$experience", "0"] } }, min] },
          { $lte: [{ $toInt: { $ifNull: ["$experience", "0"] } }, max] }
        ]
      };
    }

    if (Object.keys(match).length) pipeline.push({ $match: match });

    // Projection stage
    if (fields && Array.isArray(fields) && fields.length) {
      const proj = {};
      fields.forEach(f => (proj[f] = 1));
      // always include _id
      proj._id = 1;
      pipeline.push({ $project: proj });
    }

    // Sorting
    pipeline.push({ $sort: sort });

    // Facet for pagination + total count
    pipeline.push({
      $facet: {
        results: [
          { $skip: skip },
          { $limit: parseInt(limit, 10) },
        ],
        totalCount: [
          { $count: "count" }
        ]
      }
    });

    const agg = await Candidate.aggregate(pipeline).exec();
    const results = agg[0]?.results || [];
    const total = agg[0]?.totalCount[0]?.count || 0;

    return {
      meta: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total
      },
      results
    };
  }

  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Candidate.findById(id).exec();
  }

  async create(data, session = null) {
    // use session when provided for transactional safety
    if (session) {
      return Candidate.create([data], { session }).then(resArr => resArr[0]);
    }
    return Candidate.create(data);
  }

  async update(id, data, options = {}) {
    // options: { new: true, session, runValidators: true }
    const mongoOptions = {
      new: true,
      runValidators: true,
      context: "query",
      ...options
    };
    return Candidate.findByIdAndUpdate(id, data, mongoOptions).exec();
  }

  async delete(id, session = null) {
    if (session) {
      return Candidate.findByIdAndDelete(id, { session }).exec();
    }
    return Candidate.findByIdAndDelete(id).exec();
  }

  /**
   * Aggregation example: top skills statistics (skill, count)
   */
  async aggregateTopSkills(limit = 10) {
    const pipeline = [
      { $unwind: "$skills" },
      { $group: { _id: "$skills", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { skill: "$_id", count: 1, _id: 0 } }
    ];
    return Candidate.aggregate(pipeline).exec();
  }
}

export default CandidateRepository;

const mongoose = require('mongoose');
const Application = require('./models/Application');
require('dotenv').config();

const chooseBestApplication = (existing, candidate) => {
  if (!existing) return candidate;

  const existingFeeCount = Array.isArray(existing.fees) ? existing.fees.length : 0;
  const candidateFeeCount = Array.isArray(candidate.fees) ? candidate.fees.length : 0;
  if (candidateFeeCount !== existingFeeCount) {
    return candidateFeeCount > existingFeeCount ? candidate : existing;
  }

  const existingDate = existing.submittedAt ? new Date(existing.submittedAt) : new Date(0);
  const candidateDate = candidate.submittedAt ? new Date(candidate.submittedAt) : new Date(0);
  return candidateDate > existingDate ? candidate : existing;
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/university-admission', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const applications = await Application.find({}).lean();
    const grouped = applications.reduce((acc, app) => {
      if (!app.studentId) return acc;
      const key = app.studentId.toString();
      acc[key] = acc[key] || [];
      acc[key].push(app);
      return acc;
    }, {});

    let removedCount = 0;
    for (const [studentId, apps] of Object.entries(grouped)) {
      if (apps.length <= 1) continue;
      const best = apps.reduce((bestSoFar, candidate) => chooseBestApplication(bestSoFar, candidate), null);
      const toRemove = apps.filter(app => app._id.toString() !== best._id.toString());
      if (toRemove.length === 0) continue;

      console.log(`Keeping application ${best._id} for student ${studentId}, removing ${toRemove.length} duplicate(s)`);
      const idsToRemove = toRemove.map(app => app._id);
      const result = await Application.deleteMany({ _id: { $in: idsToRemove } });
      removedCount += result.deletedCount || 0;
    }

    console.log(`Duplicate cleanup complete. Removed ${removedCount} duplicate application document(s).`);
    process.exit(0);
  } catch (error) {
    console.error('Duplicate cleanup failed:', error);
    process.exit(1);
  }
})();
